import 'package:flutter/material.dart';

class CategoryModel {
  final int id;
  final String name;
  final String slug;
  final String? description;
  final String? imageUrl;
  final String iconName;
  final int productCount;
  final bool isActive;

  CategoryModel({
    required this.id,
    required this.name,
    required this.slug,
    this.description,
    this.imageUrl,
    this.iconName = 'spa',
    this.productCount = 0,
    this.isActive = true,
  });

  factory CategoryModel.fromJson(Map<String, dynamic> json) {
    return CategoryModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      name: json['name'] ?? '',
      slug: json['slug'] ?? '',
      description: json['description']?.toString(),
      imageUrl: json['image_url']?.toString(),
      iconName: json['icon_name']?.toString() ?? 'spa',
      productCount: json['product_count'] is int
          ? json['product_count']
          : int.tryParse(json['product_count']?.toString() ?? '0') ?? 0,
      isActive: json['is_active'] == 1 || json['is_active'] == true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'slug': slug,
      'description': description,
      'image_url': imageUrl,
      'icon_name': iconName,
      'product_count': productCount,
      'is_active': isActive ? 1 : 0,
    };
  }

  IconData get iconData {
    switch (iconName.toLowerCase()) {
      case 'spa':
        return Icons.spa_rounded;
      case 'local_fire_department':
      case 'fire':
        return Icons.local_fire_department_rounded;
      case 'whatshot':
        return Icons.whatshot_rounded;
      case 'brightness_7':
      case 'sun':
        return Icons.brightness_7_rounded;
      case 'favorite':
      case 'heart':
        return Icons.favorite_rounded;
      case 'all_inclusive':
      case 'om':
        return Icons.all_inclusive_rounded;
      case 'card_giftcard':
      case 'gift':
        return Icons.card_giftcard_rounded;
      case 'temple':
      case 'church':
        return Icons.temple_hindu_rounded;
      default:
        return Icons.auto_awesome_rounded;
    }
  }
}
