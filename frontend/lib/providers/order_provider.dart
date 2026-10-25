import 'package:flutter/material.dart';
import '../config/api_config.dart';
import '../models/cart_item_model.dart';
import '../models/order_model.dart';
import '../services/api_service.dart';

class OrderProvider with ChangeNotifier {
  List<OrderModel> _myOrders = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<OrderModel> get myOrders => _myOrders;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  OrderProvider() {
    _loadSampleOrders();
    fetchMyOrders();
  }

  void _loadSampleOrders() {
    _myOrders = [
      OrderModel(
        id: 101,
        orderNumber: 'POOJA-849201',
        userId: 2,
        customerName: 'Ramesh Sharma',
        customerPhone: '+91 91234 56789',
        totalAmount: 979.00,
        discountAmount: 0.00,
        deliveryFee: 0.00,
        finalAmount: 979.00,
        paymentMethod: 'UPI / QR Code',
        paymentStatus: 'paid',
        orderStatus: 'processing',
        shippingName: 'Ramesh Sharma',
        shippingPhone: '+91 91234 56789',
        shippingAddress: 'B-402, Shiv Dham Society, Tonk Road',
        shippingCity: 'Jaipur',
        shippingState: 'Rajasthan',
        shippingPincode: '302015',
        notes: 'Please pack delicate brass items carefully with bubble wrap.',
        items: [
          OrderItemModel(
            id: 1,
            productId: 2,
            productName: 'Handcrafted Brass Akhand Jyoti Diya',
            price: 699.00,
            quantity: 1,
            totalPrice: 699.00,
            imageUrl: 'https://images.unsplash.com/photo-1576487248805-cf45f6bcc67f?auto=format&fit=crop&w=600&q=80',
          ),
          OrderItemModel(
            id: 2,
            productId: 3,
            productName: 'Pure Bhimseni Camphor (Kapur)',
            price: 280.00,
            quantity: 1,
            totalPrice: 280.00,
            imageUrl: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&w=600&q=80',
          ),
        ],
        createdAt: DateTime.now().subtract(const Duration(days: 1, hours: 3)),
      ),
    ];
  }

  Future<void> fetchMyOrders() async {
    _isLoading = true;
    notifyListeners();

    try {
      final res = await ApiService.get(ApiConfig.myOrders, requiresAuth: true);
      if (res.success && res.data != null && res.data['orders'] != null) {
        final list = (res.data['orders'] as List)
            .map((o) => OrderModel.fromJson(o as Map<String, dynamic>))
            .toList();
        if (list.isNotEmpty) {
          _myOrders = list;
        }
      }
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<OrderModel?> placeOrder({
    required List<CartItemModel> items,
    required String shippingName,
    required String shippingPhone,
    required String shippingAddress,
    required String shippingCity,
    required String shippingState,
    required String shippingPincode,
    required String paymentMethod,
    String? notes,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final payload = {
        'items': items.map((i) => i.toJson()).toList(),
        'shipping_name': shippingName,
        'shipping_phone': shippingPhone,
        'shipping_address': shippingAddress,
        'shipping_city': shippingCity,
        'shipping_state': shippingState,
        'shipping_pincode': shippingPincode,
        'payment_method': paymentMethod,
        'notes': notes,
      };

      final res = await ApiService.post(ApiConfig.orders, payload, requiresAuth: true);

      OrderModel newOrder;
      if (res.success && res.data != null && res.data['order'] != null) {
        final orderData = res.data['order'];
        newOrder = OrderModel(
          id: orderData['id'] ?? DateTime.now().millisecondsSinceEpoch % 10000,
          orderNumber: orderData['order_number'] ?? 'POOJA-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
          userId: 2,
          shippingName: shippingName,
          shippingPhone: shippingPhone,
          shippingAddress: shippingAddress,
          shippingCity: shippingCity,
          shippingState: shippingState,
          shippingPincode: shippingPincode,
          paymentMethod: paymentMethod,
          paymentStatus: paymentMethod == 'Cash on Delivery' ? 'pending' : 'paid',
          orderStatus: 'pending',
          totalAmount: items.fold(0.0, (sum, i) => sum + i.totalPrice),
          finalAmount: (orderData['final_amount'] != null)
              ? double.tryParse(orderData['final_amount'].toString()) ?? 0.0
              : items.fold(0.0, (sum, i) => sum + i.totalPrice),
          items: items.map((i) => OrderItemModel(
            id: DateTime.now().millisecondsSinceEpoch % 1000,
            productId: i.product.id,
            productName: i.product.name,
            price: i.product.effectivePrice,
            quantity: i.quantity,
            totalPrice: i.totalPrice,
            imageUrl: i.product.imageUrl,
          )).toList(),
          createdAt: DateTime.now(),
        );
      } else {
        // Local fallback order generation
        final total = items.fold(0.0, (sum, i) => sum + i.totalPrice);
        final fee = total >= 499 ? 0.0 : 50.0;
        newOrder = OrderModel(
          id: DateTime.now().millisecondsSinceEpoch % 10000,
          orderNumber: 'POOJA-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
          userId: 2,
          shippingName: shippingName,
          shippingPhone: shippingPhone,
          shippingAddress: shippingAddress,
          shippingCity: shippingCity,
          shippingState: shippingState,
          shippingPincode: shippingPincode,
          paymentMethod: paymentMethod,
          paymentStatus: paymentMethod == 'Cash on Delivery' ? 'pending' : 'paid',
          orderStatus: 'pending',
          totalAmount: total,
          deliveryFee: fee,
          finalAmount: total + fee,
          items: items.map((i) => OrderItemModel(
            id: DateTime.now().millisecondsSinceEpoch % 1000,
            productId: i.product.id,
            productName: i.product.name,
            price: i.product.effectivePrice,
            quantity: i.quantity,
            totalPrice: i.totalPrice,
            imageUrl: i.product.imageUrl,
          )).toList(),
          createdAt: DateTime.now(),
        );
      }

      _myOrders.insert(0, newOrder);
      _isLoading = false;
      notifyListeners();
      return newOrder;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }
}
