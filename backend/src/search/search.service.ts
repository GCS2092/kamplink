import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private client: Client | null = null;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const elasticsearchUrl = this.configService.get('ELASTICSEARCH_URL');
    
    if (!elasticsearchUrl) {
      this.logger.warn('ELASTICSEARCH_URL not configured, search service disabled');
      return;
    }

    try {
      this.client = new Client({
        node: elasticsearchUrl,
      });

      const health = await this.client.cluster.health();
      this.logger.log(`Elasticsearch connected: ${health.status}`);

      // Initialize indices
      await this.initializeIndices();
    } catch (error) {
      this.logger.error(`Elasticsearch connection failed: ${error.message}`);
      this.client = null;
    }
  }

  private async initializeIndices() {
    if (!this.client) return;

    const indices = ['messages', 'documents', 'opportunities', 'users'];
    
    for (const index of indices) {
      const exists = await this.client.indices.exists({ index });
      if (!exists) {
        await this.client.indices.create({
          index,
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                content: { 
                  type: 'text',
                  analyzer: 'french',
                  fields: {
                    keyword: { type: 'keyword' }
                  }
                },
                title: { 
                  type: 'text',
                  analyzer: 'french',
                  fields: {
                    keyword: { type: 'keyword' }
                  }
                },
                createdAt: { type: 'date' },
                userId: { type: 'keyword' },
                tags: { type: 'keyword' },
              },
            },
          },
        });
        this.logger.log(`Created index: ${index}`);
      }
    }
  }

  async indexDocument(index: string, id: string, document: any): Promise<void> {
    if (!this.client) {
      this.logger.debug(`Search disabled, skipping index: ${index}/${id}`);
      return;
    }

    try {
      await this.client.index({
        index,
        id,
        body: document,
        refresh: 'wait_for',
      });
    } catch (error) {
      this.logger.error(`Failed to index document: ${error.message}`);
    }
  }

  async search(index: string, query: string, options?: {
    filters?: Record<string, any>;
    sort?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    if (!this.client) {
      this.logger.warn('Search unavailable, Elasticsearch not connected');
      return { hits: { hits: [] }, total: 0 };
    }

    const { filters = {}, sort = 'createdAt:desc', page = 1, limit = 20 } = options || {};
    const from = (page - 1) * limit;

    try {
      const response = await this.client.search({
        index,
        body: {
          from,
          size: limit,
          query: {
            bool: {
              must: [
                {
                  multi_match: {
                    query,
                    fields: ['title^3', 'content^2', 'tags'],
                    type: 'best_fields',
                    fuzziness: 'AUTO',
                  },
                },
              ],
              filter: Object.entries(filters).map(([key, value]) => ({
                term: { [key]: value },
              })),
            },
          },
          sort: sort.split(',').map(s => {
            const [field, order] = s.split(':');
            return { [field]: order || 'desc' };
          }),
          highlight: {
            fields: {
              title: {},
              content: {},
            },
          },
        },
      });

      return {
        hits: response.hits.hits.map(hit => ({
          id: hit._id,
          score: hit._score,
          source: hit._source,
          highlights: hit.highlight,
        })),
        total: response.hits.total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(`Search failed: ${error.message}`);
      throw error;
    }
  }

  async deleteDocument(index: string, id: string): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.delete({
        index,
        id,
        refresh: 'wait_for',
      });
    } catch (error) {
      this.logger.error(`Failed to delete document: ${error.message}`);
    }
  }

  async updateDocument(index: string, id: string, partial: any): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.update({
        index,
        id,
        body: {
          doc: partial,
        },
        refresh: 'wait_for',
      });
    } catch (error) {
      this.logger.error(`Failed to update document: ${error.message}`);
    }
  }
}
