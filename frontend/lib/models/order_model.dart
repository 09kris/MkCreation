import 'package:flutter/material.dart';

class OrderItemModel {
  final int id;
  final int? productId;
  final String productName;
  final double price;
  final int quantity;
  final double totalPrice;
  final String? imageUrl;

  OrderItemModel({
    required this.id,
    this.productId,
    required this.productName,
    required this.price,
    required this.quantity,
    required this.totalPrice,
    this.imageUrl,
  });

  factory OrderItemModel.fromJson(Map<String, dynamic> json) {
    return OrderItemModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      productId: json['product_id'] != null ? int.tryParse(json['product_id'].toString()) : null,
      productName: json['product_name'] ?? 'Pooja Item',
      price: json['price'] != null ? (double.tryParse(json['price'].toString()) ?? 0.0) : 0.0,
      quantity: json['quantity'] is int ? json['quantity'] : int.tryParse(json['quantity']?.toString() ?? '1') ?? 1,
      totalPrice: json['total_price'] != null
          ? (double.tryParse(json['total_price'].toString()) ?? 0.0)
          : 0.0,
      imageUrl: json['image_url']?.toString(),
    );
  }
}

class OrderModel {
  final int id;
  final String orderNumber;
  final int userId;
  final String? customerName;
  final String? customerEmail;
  final String? customerPhone;
  final double totalAmount;
  final double discountAmount;
  final double deliveryFee;
  final double finalAmount;
  final String paymentMethod;
  final String paymentStatus;
  final String orderStatus; // pending, confirmed, processing, shipped, delivered, cancelled
  final String shippingName;
  final String shippingPhone;
  final String shippingAddress;
  final String shippingCity;
  final String shippingState;
  final String shippingPincode;
  final String? notes;
  final List<OrderItemModel> items;
  final DateTime createdAt;

  OrderModel({
    required this.id,
    required this.orderNumber,
    required this.userId,
    this.customerName,
    this.customerEmail,
    this.customerPhone,
    required this.totalAmount,
    this.discountAmount = 0.0,
    this.deliveryFee = 0.0,
    required this.finalAmount,
    required this.paymentMethod,
    required this.paymentStatus,
    required this.orderStatus,
    required this.shippingName,
    required this.shippingPhone,
    required this.shippingAddress,
    required this.shippingCity,
    required this.shippingState,
    required this.shippingPincode,
    this.notes,
    required this.items,
    required this.createdAt,
  });

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    List<OrderItemModel> parsedItems = [];
    if (json['items'] != null && json['items'] is List) {
      parsedItems = (json['items'] as List)
          .map((i) => OrderItemModel.fromJson(i as Map<String, dynamic>))
          .toList();
    }

    DateTime parsedDate;
    try {
      parsedDate = json['created_at'] != null
          ? DateTime.parse(json['created_at'].toString())
          : DateTime.now();
    } catch (_) {
      parsedDate = DateTime.now();
    }

    return OrderModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      orderNumber: json['order_number'] ?? '',
      userId: json['user_id'] is int ? json['user_id'] : int.tryParse(json['user_id']?.toString() ?? '0') ?? 0,
      customerName: json['customer_name']?.toString(),
      customerEmail: json['customer_email']?.toString(),
      customerPhone: json['customer_phone']?.toString(),
      totalAmount: json['total_amount'] != null ? (double.tryParse(json['total_amount'].toString()) ?? 0.0) : 0.0,
      discountAmount: json['discount_amount'] != null ? (double.tryParse(json['discount_amount'].toString()) ?? 0.0) : 0.0,
      deliveryFee: json['delivery_fee'] != null ? (double.tryParse(json['delivery_fee'].toString()) ?? 0.0) : 0.0,
      finalAmount: json['final_amount'] != null ? (double.tryParse(json['final_amount'].toString()) ?? 0.0) : 0.0,
      paymentMethod: json['payment_method'] ?? 'Cash on Delivery',
      paymentStatus: json['payment_status'] ?? 'pending',
      orderStatus: (json['order_status'] ?? 'pending').toString().toLowerCase(),
      shippingName: json['shipping_name'] ?? '',
      shippingPhone: json['shipping_phone'] ?? '',
      shippingAddress: json['shipping_address'] ?? '',
      shippingCity: json['shipping_city'] ?? '',
      shippingState: json['shipping_state'] ?? '',
      shippingPincode: json['shipping_pincode'] ?? '',
      notes: json['notes']?.toString(),
      items: parsedItems,
      createdAt: parsedDate,
    );
  }

  Color get statusColor {
    switch (orderStatus) {
      case 'pending':
        return Colors.orange;
      case 'confirmed':
        return Colors.blue;
      case 'processing':
        return Colors.purple;
      case 'shipped':
        return Colors.indigo;
      case 'delivered':
        return Colors.green;
      case 'cancelled':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String get statusDisplay {
    if (orderStatus.isEmpty) return 'Pending';
    return orderStatus[0].toUpperCase() + orderStatus.substring(1);
  }
}
