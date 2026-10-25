class ProductModel {
  final int id;
  final int categoryId;
  final String? categoryName;
  final String name;
  final String? description;
  final double price;
  final double? discountPrice;
  final int stockQuantity;
  final String unit;
  final String? imageUrl;
  final bool isFeatured;
  final bool isActive;

  ProductModel({
    required this.id,
    required this.categoryId,
    this.categoryName,
    required this.name,
    this.description,
    required this.price,
    this.discountPrice,
    required this.stockQuantity,
    this.unit = 'piece',
    this.imageUrl,
    this.isFeatured = false,
    this.isActive = true,
  });

  double get effectivePrice => (discountPrice != null && discountPrice! < price) ? discountPrice! : price;

  bool get hasDiscount => discountPrice != null && discountPrice! < price;

  int get discountPercent {
    if (!hasDiscount || price <= 0) return 0;
    return (((price - discountPrice!) / price) * 100).round();
  }

  bool get inStock => stockQuantity > 0;
  bool get isLowStock => stockQuantity > 0 && stockQuantity <= 10;

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    return ProductModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      categoryId: json['category_id'] is int
          ? json['category_id']
          : int.tryParse(json['category_id']?.toString() ?? '0') ?? 0,
      categoryName: json['category_name']?.toString(),
      name: json['name'] ?? '',
      description: json['description']?.toString(),
      price: json['price'] != null ? (double.tryParse(json['price'].toString()) ?? 0.0) : 0.0,
      discountPrice: json['discount_price'] != null ? double.tryParse(json['discount_price'].toString()) : null,
      stockQuantity: json['stock_quantity'] is int
          ? json['stock_quantity']
          : int.tryParse(json['stock_quantity']?.toString() ?? '0') ?? 0,
      unit: json['unit']?.toString() ?? 'piece',
      imageUrl: json['image_url']?.toString(),
      isFeatured: json['is_featured'] == 1 || json['is_featured'] == true,
      isActive: json['is_active'] == 1 || json['is_active'] == true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'category_id': categoryId,
      'name': name,
      'description': description,
      'price': price,
      'discount_price': discountPrice,
      'stock_quantity': stockQuantity,
      'unit': unit,
      'image_url': imageUrl,
      'is_featured': isFeatured ? 1 : 0,
      'is_active': isActive ? 1 : 0,
    };
  }

  ProductModel copyWith({
    int? categoryId,
    String? categoryName,
    String? name,
    String? description,
    double? price,
    double? discountPrice,
    int? stockQuantity,
    String? unit,
    String? imageUrl,
    bool? isFeatured,
    bool? isActive,
  }) {
    return ProductModel(
      id: id,
      categoryId: categoryId ?? this.categoryId,
      categoryName: categoryName ?? this.categoryName,
      name: name ?? this.name,
      description: description ?? this.description,
      price: price ?? this.price,
      discountPrice: discountPrice ?? this.discountPrice,
      stockQuantity: stockQuantity ?? this.stockQuantity,
      unit: unit ?? this.unit,
      imageUrl: imageUrl ?? this.imageUrl,
      isFeatured: isFeatured ?? this.isFeatured,
      isActive: isActive ?? this.isActive,
    );
  }
}
