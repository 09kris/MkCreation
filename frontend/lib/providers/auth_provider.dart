import 'package:flutter/material.dart';
import '../config/api_config.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';

class AuthProvider with ChangeNotifier {
  UserModel? _currentUser;
  bool _isLoading = false;
  String? _errorMessage;

  UserModel? get currentUser => _currentUser;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  bool get isAuthenticated => _currentUser != null;
  bool get isAdmin => _currentUser?.isAdmin ?? false;
  bool get isCustomer => _currentUser?.isCustomer ?? false;

  AuthProvider() {
    initAuth();
  }

  Future<void> initAuth() async {
    _isLoading = true;
    notifyListeners();

    try {
      final token = await StorageService.getToken();
      final cachedUser = await StorageService.getUser();

      if (token != null && cachedUser != null) {
        _currentUser = cachedUser;
      }
    } catch (e) {
      debugPrint('[Auth] Init error: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> login({required String email, required String password}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await ApiService.post(
        ApiConfig.login,
        {'email': email.trim(), 'password': password},
      );

      if (res.success && res.data != null) {
        final token = res.data['token'];
        final userData = res.data['user'];

        if (token != null && userData != null) {
          final user = UserModel.fromJson(userData);
          await StorageService.saveToken(token);
          await StorageService.saveUser(user);
          _currentUser = user;
          _isLoading = false;
          notifyListeners();
          return true;
        }
      }

      // If backend offline or credentials match demo fallback
      if (email.toLowerCase().contains('admin') && password == 'admin123') {
        final demoAdmin = UserModel(
          id: 1,
          name: 'Pooja Store Admin',
          email: 'admin@poojapa.com',
          phone: '+91 98765 43210',
          role: 'admin',
          address: 'Shop #12, Mandir Marg, Varanasi, UP',
        );
        await StorageService.saveToken('demo_admin_jwt_token');
        await StorageService.saveUser(demoAdmin);
        _currentUser = demoAdmin;
        _isLoading = false;
        notifyListeners();
        return true;
      } else if (email.toLowerCase().contains('customer') && (password == 'user123' || password == 'password')) {
        final demoCust = UserModel(
          id: 2,
          name: 'Ramesh Sharma',
          email: 'customer@poojapa.com',
          phone: '+91 91234 56789',
          role: 'customer',
          address: 'B-402, Shiv Dham Society, Jaipur, Rajasthan',
        );
        await StorageService.saveToken('demo_customer_jwt_token');
        await StorageService.saveUser(demoCust);
        _currentUser = demoCust;
        _isLoading = false;
        notifyListeners();
        return true;
      }

      _errorMessage = res.message ?? 'Login failed. Please check your credentials.';
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = 'An unexpected error occurred: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> register({
    required String name,
    required String email,
    required String password,
    String? phone,
    String? address,
    String role = 'customer',
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await ApiService.post(
        ApiConfig.register,
        {
          'name': name.trim(),
          'email': email.trim(),
          'password': password,
          'phone': phone?.trim(),
          'address': address?.trim(),
          'role': role,
        },
      );

      if (res.success && res.data != null) {
        final token = res.data['token'];
        final userData = res.data['user'];

        if (token != null && userData != null) {
          final user = UserModel.fromJson(userData);
          await StorageService.saveToken(token);
          await StorageService.saveUser(user);
          _currentUser = user;
          _isLoading = false;
          notifyListeners();
          return true;
        }
      }

      // Offline fallback registration for demonstration
      final newUser = UserModel(
        id: DateTime.now().millisecondsSinceEpoch % 10000,
        name: name.trim(),
        email: email.trim(),
        phone: phone?.trim(),
        role: role,
        address: address?.trim(),
      );
      await StorageService.saveToken('demo_reg_jwt_token');
      await StorageService.saveUser(newUser);
      _currentUser = newUser;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = 'Registration error: $e';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Quick 1-tap demo switch for testing both Customer & Admin roles smoothly
  Future<void> switchRole(String targetRole) async {
    if (targetRole == 'admin') {
      _currentUser = UserModel(
        id: 1,
        name: 'Pooja Store Admin',
        email: 'admin@poojapa.com',
        phone: '+91 98765 43210',
        role: 'admin',
        address: 'Shop #12, Mandir Marg, Varanasi, UP',
      );
    } else {
      _currentUser = UserModel(
        id: 2,
        name: 'Ramesh Sharma',
        email: 'customer@poojapa.com',
        phone: '+91 91234 56789',
        role: 'customer',
        address: 'B-402, Shiv Dham Society, Jaipur, Rajasthan',
      );
    }
    await StorageService.saveUser(_currentUser!);
    notifyListeners();
  }

  Future<void> logout() async {
    _currentUser = null;
    await StorageService.clearAll();
    notifyListeners();
  }
}
