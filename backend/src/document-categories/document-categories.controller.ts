import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { DocumentCategoriesService } from './document-categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

// Lecture: tout utilisateur connecte. Gestion: admin, superadmin, content_admin.
@UseGuards(AuthGuard)
@Controller('document-categories')
export class DocumentCategoriesController {
  constructor(private service: DocumentCategoriesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'superadmin', 'content_admin')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.service.createCategory(dto);
  }

  @Patch('subcategories/:id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'superadmin', 'content_admin')
  updateSubcategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.service.updateSubcategory(id, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'superadmin', 'content_admin')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.service.updateCategory(id, dto);
  }

  @Post(':id/subcategories')
  @UseGuards(RolesGuard)
  @Roles('admin', 'superadmin', 'content_admin')
  createSubcategory(@Param('id') id: string, @Body() dto: CreateCategoryDto) {
    return this.service.createSubcategory(id, dto);
  }
}