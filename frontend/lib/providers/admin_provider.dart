import 'package:flutter/material.dart';
import '../config/api_config.dart';
import '../models/order_model.dart';
import '../models/product_model.dart';
import '../services/api_service.dart';

class AdminProvider with ChangeNotifier {
  List<OrderModel> _allOrders = [];
  Map<String, dynamic> _stats = {
    'total_revenue': 14850.00,
    'total_orders': 18,
    'total_customers': 24,
    'total_products': 16,
    'low_stock_count': 3,
  };
  bool _isLoading = false;
  String _selectedStatusFilter = 'all';
  String? _errorMessage;

  List<OrderModel> get allOrders => _filteredOrders;
  List<OrderModel> get rawOrders => _allOrders;
  Map<String, dynamic> get stats => _stats;
  bool get isLoading => _isLoading;
  String get selectedStatusFilter => _selectedStatusFilter;
  String? get errorMessage => _errorMessage;

  AdminProvider() {
    _loadSampleAdminOrders();
    fetchDashboardStats();
    fetchAllOrders();
  }

  void _loadSampleAdminOrders() {
    _allOrders = [
      OrderModel(
        id: 101,
        orderNumber: 'POOJA-849201',
        userId: 2,
        customerName: 'Ramesh Sharma',
        customerPhone: '+91 91234 56789',
        customerEmail: 'customer@poojapa.com',
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
        createdAt: DateTime.now().subtract(const Duration(hours: 4)),
      ),
      OrderModel(
        id: 102,
        orderNumber: 'POOJA-391823',
        userId: 3,
        customerName: 'Pooja Verma',
        customerPhone: '+91 98111 22334',
        customerEmail: 'pooja.verma@gmail.com',
        totalAmount: 1499.00,
        discountAmount: 0.00,
        deliveryFee: 0.00,
        finalAmount: 1499.00,
        paymentMethod: 'Cash on Delivery',
        paymentStatus: 'pending',
        orderStatus: 'pending',
        shippingName: 'Pooja Verma',
        shippingPhone: '+91 98111 22334',
        shippingAddress: 'Flat 12, Krishna Enclave, Kashi Vishwanath Marg',
        shippingCity: 'Varanasi',
        shippingState: 'Uttar Pradesh',
        shippingPincode: '221001',
        items: [
          OrderItemModel(
            id: 3,
            productId: 4,
            productName: 'Brass Lord Ganesha Idol',
            price: 1199.00,
            quantity: 1,
            totalPrice: 1199.00,
            imageUrl: 'https://images.unsplash.com/photo-1567591974584-f1832d949213?auto=format&fit=crop&w=600&q=80',
          ),
          OrderItemModel(
            id: 4,
            productId: 8,
            productName: 'Ashtagandha Chandan Paste',
            price: 130.00,
            quantity: 1,
            totalPrice: 130.00,
            imageUrl: 'https://images.unsplash.com/photo-1621849400072-f554417f7051?auto=format&fit=crop&w=600&q=80',
          ),
        ],
        createdAt: DateTime.now().subtract(const Duration(hours: 12)),
      ),
      OrderModel(
        id: 103,
        orderNumber: 'POOJA-772910',
        userId: 4,
        customerName: 'Anil Kumar Mishra',
        customerPhone: '+91 94520 88711',
        customerEmail: 'anil.mishra@outlook.com',
        totalAmount: 799.00,
        discountAmount: 0.00,
        deliveryFee: 0.00,
        finalAmount: 799.00,
        paymentMethod: 'UPI / QR Code',
        paymentStatus: 'paid',
        orderStatus: 'delivered',
        shippingName: 'Anil Mishra',
        shippingPhone: '+91 94520 88711',
        shippingAddress: 'Sector 5, Gomti Nagar',
        shippingCity: 'Lucknow',
        shippingState: 'Uttar Pradesh',
        shippingPincode: '226010',
        items: [
          OrderItemModel(
            id: 5,
            productId: 6,
            productName: 'Daily Nitya Pooja Samagri Kit',
            price: 799.00,
            quantity: 1,
            totalPrice: 799.00,
            imageUrl: 'https://images.unsplash.com/photo-1545232979-8bf68ee9b1af?auto=format&fit=crop&w=600&q=80',
          ),
        ],
        createdAt: DateTime.now().subtract(const Duration(days: 3)),
      ),
    ];
  }

  List<OrderModel> get _filteredOrders {
    if (_selectedStatusFilter == 'all') return _allOrders;
    return _allOrders.where((o) => o.orderStatus.toLowerCase() == _selectedStatusFilter.toLowerCase()).toList();
  }

  void setStatusFilter(String status) {
    _selectedStatusFilter = status;
    notifyListeners();
  }

  Future<void> fetchDashboardStats() async {
    try {
      final res = await ApiService.get(ApiConfig.adminDashboard, requiresAuth: true);
      if (res.success && res.data != null && res.data['stats'] != null) {
        _stats = res.data['stats'];
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> fetchAllOrders({String status = 'all'}) async {
    _isLoading = true;
    notifyListeners();

    try {
      final query = status != 'all' ? '?status=$status' : '';
      final res = await ApiService.get('${ApiConfig.adminOrders}$query', requiresAuth: true);
      if (res.success && res.data != null && res.data['orders'] != null) {
        final list = (res.data['orders'] as List)
            .map((o) => OrderModel.fromJson(o as Map<String, dynamic>))
            .toList();
        if (list.isNotEmpty) {
          _allOrders = list;
        }
      }
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> updateOrderStatus(int orderId, String newStatus, {String? paymentStatus}) async {
    _isLoading = true;
    notifyListeners();

    try {
      final payload = <String, dynamic>{
        'order_status': newStatus,
        'payment_status': ?paymentStatus,
      };

      await ApiService.put(
        ApiConfig.updateOrderStatus(orderId),
        payload,
        requiresAuth: true,
      );

      // Update in local state
      final idx = _allOrders.indexWhere((o) => o.id == orderId);
      if (idx != -1) {
        final old = _allOrders[idx];
        _allOrders[idx] = OrderModel(
          id: old.id,
          orderNumber: old.orderNumber,
          userId: old.userId,
          customerName: old.customerName,
          customerEmail: old.customerEmail,
          customerPhone: old.customerPhone,
          totalAmount: old.totalAmount,
          discountAmount: old.discountAmount,
          deliveryFee: old.deliveryFee,
          finalAmount: old.finalAmount,
          paymentMethod: old.paymentMethod,
          paymentStatus: paymentStatus ?? (newStatus == 'delivered' ? 'paid' : old.paymentStatus),
          orderStatus: newStatus,
          shippingName: old.shippingName,
          shippingPhone: old.shippingPhone,
          shippingAddress: old.shippingAddress,
          shippingCity: old.shippingCity,
          shippingState: old.shippingState,
          shippingPincode: old.shippingPincode,
          notes: old.notes,
          items: old.items,
          createdAt: old.createdAt,
        );
      }

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<ProductModel?> saveProduct({
    int? id,
    required int categoryId,
    required String name,
    required String description,
    required double price,
    double? discountPrice,
    required int stockQuantity,
    required String unit,
    String? imageUrl,
    bool isFeatured = false,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      final payload = {
        'category_id': categoryId,
        'name': name.trim(),
        'description': description.trim(),
        'price': price,
        'discount_price': discountPrice,
        'stock_quantity': stockQuantity,
        'unit': unit,
        'image_url': imageUrl,
        'is_featured': isFeatured,
      };

      ApiResponse res;
      if (id != null) {
        res = await ApiService.put('${ApiConfig.products}/$id', payload, requiresAuth: true);
      } else {
        res = await ApiService.post(ApiConfig.products, payload, requiresAuth: true);
      }

      ProductModel savedProduct;
      if (res.success && res.data != null && res.data['product'] != null) {
        savedProduct = ProductModel.fromJson(res.data['product']);
      } else {
        savedProduct = ProductModel(
          id: id ?? (DateTime.now().millisecondsSinceEpoch % 10000),
          categoryId: categoryId,
          name: name.trim(),
          description: description.trim(),
          price: price,
          discountPrice: discountPrice,
          stockQuantity: stockQuantity,
          unit: unit,
          imageUrl: imageUrl ?? 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=600&q=80',
          isFeatured: isFeatured,
        );
      }

      _isLoading = false;
      notifyListeners();
      return savedProduct;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  Future<bool> deleteProduct(int productId) async {
    _isLoading = true;
    notifyListeners();

    try {
      await ApiService.delete('${ApiConfig.products}/$productId', requiresAuth: true);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }
}
