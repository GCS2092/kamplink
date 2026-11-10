import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

// Les doublons de nom (P2002) sont convertis en 409 par le filtre global
@Injectable()
export class DocumentCategoriesService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.documentCategory.findMany({
      where: { estActive: true },
      orderBy: { nom: 'asc' },
      include: {
        subcategories: { where: { estActive: true }, orderBy: { nom: 'asc' } },
      },
    });
  }

  createCategory(dto: CreateCategoryDto) {
    return this.prisma.documentCategory.create({
      data: { nom: dto.nom.trim(), description: dto.description },
    });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const c = await this.prisma.documentCategory.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Catégorie introuvable');
    return this.prisma.documentCategory.update({
      where: { id },
      data: {
        ...(dto.nom && { nom: dto.nom.trim() }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.estActive !== undefined && { estActive: dto.estActive }),
      },
    });
  }

  async createSubcategory(categoryId: string, dto: CreateCategoryDto) {
    const c = await this.prisma.documentCategory.findUnique({ where: { id: categoryId } });
    if (!c) throw new NotFoundException('Catégorie introuvable');
    return this.prisma.documentSubcategory.create({
      data: { categoryId, nom: dto.nom.trim(), description: dto.description },
    });
  }

  async updateSubcategory(id: string, dto: UpdateCategoryDto) {
    const s = await this.prisma.documentSubcategory.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Sous-catégorie introuvable');
    return this.prisma.documentSubcategory.update({
      where: { id },
      data: {
        ...(dto.nom && { nom: dto.nom.trim() }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.estActive !== undefined && { estActive: dto.estActive }),
      },
    });
  }
}