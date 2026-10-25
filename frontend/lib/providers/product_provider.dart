import 'package:flutter/material.dart';
import '../config/api_config.dart';
import '../models/category_model.dart';
import '../models/product_model.dart';
import '../services/api_service.dart';

class ProductProvider with ChangeNotifier {
  List<CategoryModel> _categories = [];
  List<ProductModel> _products = [];
  List<ProductModel> _featuredProducts = [];
  bool _isLoading = false;
  String? _errorMessage;
  int? _selectedCategoryId;
  String _searchQuery = '';

  List<CategoryModel> get categories => _categories;
  List<ProductModel> get products => _filteredProducts;
  List<ProductModel> get allProducts => _products;
  List<ProductModel> get featuredProducts => _featuredProducts;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  int? get selectedCategoryId => _selectedCategoryId;
  String get searchQuery => _searchQuery;

  ProductProvider() {
    _loadInitialSeedData();
    fetchCategories();
    fetchProducts();
  }

  void _loadInitialSeedData() {
    _categories = [
      CategoryModel(
        id: 1,
        name: 'Agarbatti & Dhoop',
        slug: 'agarbatti-dhoop',
        description: 'Aromatic incense sticks, pure Guggal, and Loban cups.',
        imageUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=600&q=80',
        iconName: 'spa',
        productCount: 3,
      ),
      CategoryModel(
        id: 2,
        name: 'Brass Utensils & Diya',
        slug: 'brass-copper-utensils',
        description: 'Akhand Diya, Aarti Thali, Panchapatra, and Temple bells.',
        imageUrl: 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&w=600&q=80',
        iconName: 'local_fire_department',
        productCount: 3,
      ),
      CategoryModel(
        id: 3,
        name: 'Hawan & Camphor',
        slug: 'hawan-camphor',
        description: '100% Pure Bhimseni Kapur, Dry Mango Wood, and Samagri.',
        imageUrl: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&w=600&q=80',
        iconName: 'whatshot',
        productCount: 3,
      ),
      CategoryModel(
        id: 4,
        name: 'Sacred Idols',
        slug: 'sacred-idols',
        description: 'Vastu & Mandir idols of Lord Ganesha, Lakshmi, and Bal Gopal.',
        imageUrl: 'https://images.unsplash.com/photo-1567591974584-f1832d949213?auto=format&fit=crop&w=600&q=80',
        iconName: 'brightness_7',
        productCount: 2,
      ),
      CategoryModel(
        id: 5,
        name: 'Pooja Essentials',
        slug: 'pooja-essentials',
        description: 'Original Ashtagandha Chandan, Roli Kumkum, and Ganga Jal.',
        imageUrl: 'https://images.unsplash.com/photo-1621849400072-f554417f7051?auto=format&fit=crop&w=600&q=80',
        iconName: 'favorite',
        productCount: 2,
      ),
      CategoryModel(
        id: 6,
        name: 'Jap Malas',
        slug: 'jap-malas',
        description: 'Original 108 Beads Rudraksha Mala and Holy Tulsi Mala.',
        imageUrl: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=600&q=80',
        iconName: 'all_inclusive',
        productCount: 1,
      ),
      CategoryModel(
        id: 7,
        name: 'Complete Pooja Kits',
        slug: 'pooja-kits',
        description: 'Convenient curated kits for Daily Nitya Pooja and Navratri.',
        imageUrl: 'https://images.unsplash.com/photo-1545232979-8bf68ee9b1af?auto=format&fit=crop&w=600&q=80',
        iconName: 'card_giftcard',
        productCount: 2,
      ),
    ];

    _products = [
      ProductModel(
        id: 1,
        categoryId: 1,
        categoryName: 'Agarbatti & Dhoop',
        name: 'Pure Mysore Sandalwood Agarbatti',
        description: 'Traditional charcoal-free natural incense sticks made with pure Mysore sandalwood oil. Burns cleanly for 50 minutes leaving an auspicious, calming fragrance.',
        price: 180.00,
        discountPrice: 149.00,
        stockQuantity: 120,
        unit: 'Pack of 150 sticks',
        imageUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=600&q=80',
        isFeatured: true,
      ),
      ProductModel(
        id: 2,
        categoryId: 2,
        categoryName: 'Brass Utensils & Diya',
        name: 'Handcrafted Brass Akhand Jyoti Diya',
        description: 'Heavy virgin brass continuous burning Akhand Deep with heat-resistant Borosilicate glass chimney. Ensures constant flame for days.',
        price: 899.00,
        discountPrice: 699.00,
        stockQuantity: 45,
        unit: 'Medium (6.5 inches)',
        imageUrl: 'https://images.unsplash.com/photo-1576487248805-cf45f6bcc67f?auto=format&fit=crop&w=600&q=80',
        isFeatured: true,
      ),
      ProductModel(
        id: 3,
        categoryId: 3,
        categoryName: 'Hawan & Camphor',
        name: 'Pure Bhimseni Camphor (Kapur)',
        description: '100% natural, edible grade crystalline Bhimseni Kapur without wax. Leaves zero residue and produces an uplifting divine fragrance.',
        price: 350.00,
        discountPrice: 280.00,
        stockQuantity: 110,
        unit: 'Jar of 200 grams',
        imageUrl: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&w=600&q=80',
        isFeatured: true,
      ),
      ProductModel(
        id: 4,
        categoryId: 4,
        categoryName: 'Sacred Idols',
        name: 'Brass Lord Ganesha Idol (Blessing Mudra)',
        description: 'Solid brass intricately detailed Ganesh Ji with Modak and Mushak. Highly auspicious for temple altar and housewarming.',
        price: 1499.00,
        discountPrice: 1199.00,
        stockQuantity: 25,
        unit: 'Height: 5 Inches',
        imageUrl: 'https://images.unsplash.com/photo-1567591974584-f1832d949213?auto=format&fit=crop&w=600&q=80',
        isFeatured: true,
      ),
      ProductModel(
        id: 5,
        categoryId: 6,
        categoryName: 'Jap Malas',
        name: 'Original 5 Mukhi Rudraksha Jap Mala',
        description: 'Certified natural five-faced Rudraksha prayer rosary with knotted cotton thread. Energized for Shiva mantra chanting.',
        price: 499.00,
        discountPrice: 399.00,
        stockQuantity: 65,
        unit: '108 Beads with Gomukhi Bag',
        imageUrl: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=600&q=80',
        isFeatured: true,
      ),
      ProductModel(
        id: 6,
        categoryId: 7,
        categoryName: 'Complete Pooja Kits',
        name: 'Daily Nitya Pooja Samagri Kit (30 Items)',
        description: 'Everything required for your everyday prayer ritual: Diya wicks, Roli, Akshat, Chandan, Dhoop, Kapur, Ganga Jal, Itra, Mauli, and Bell.',
        price: 999.00,
        discountPrice: 799.00,
        stockQuantity: 35,
        unit: 'All-In-One Box',
        imageUrl: 'https://images.unsplash.com/photo-1545232979-8bf68ee9b1af?auto=format&fit=crop&w=600&q=80',
        isFeatured: true,
      ),
      ProductModel(
        id: 7,
        categoryId: 2,
        categoryName: 'Brass Utensils & Diya',
        name: 'Complete Brass Aarti Thali Set (7 Pieces)',
        description: 'Gracefully engraved brass Pooja Thali containing Diya, Agarbatti stand, Kumkum cup, Pancha patra spoon, Bell with Nandi, and Camphor burner.',
        price: 1250.00,
        discountPrice: 999.00,
        stockQuantity: 30,
        unit: 'Complete Set',
        imageUrl: 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&w=600&q=80',
        isFeatured: false,
      ),
      ProductModel(
        id: 8,
        categoryId: 5,
        categoryName: 'Pooja Essentials',
        name: 'Original Ashtagandha Chandan Paste',
        description: 'Vedic formulation made from 8 fragrant divine herbs including saffron, chandan, and camphor. Provides cool calm focus.',
        price: 160.00,
        discountPrice: 130.00,
        stockQuantity: 90,
        unit: 'Bottle 100g',
        imageUrl: 'https://images.unsplash.com/photo-1621849400072-f554417f7051?auto=format&fit=crop&w=600&q=80',
        isFeatured: false,
      ),
    ];

    _featuredProducts = _products.where((p) => p.isFeatured).toList();
  }

  List<ProductModel> get _filteredProducts {
    return _products.where((p) {
      final matchesCategory = _selectedCategoryId == null || p.categoryId == _selectedCategoryId;
      final matchesSearch = _searchQuery.isEmpty ||
          p.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          (p.description != null && p.description!.toLowerCase().contains(_searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    }).toList();
  }

  void setSelectedCategory(int? categoryId) {
    _selectedCategoryId = categoryId;
    notifyListeners();
  }

  void setSearchQuery(String query) {
    _searchQuery = query.trim();
    notifyListeners();
  }

  Future<void> fetchCategories() async {
    try {
      final res = await ApiService.get(ApiConfig.categories);
      if (res.success && res.data != null && res.data['categories'] != null) {
        final list = (res.data['categories'] as List)
            .map((c) => CategoryModel.fromJson(c as Map<String, dynamic>))
            .toList();
        if (list.isNotEmpty) {
          _categories = list;
          notifyListeners();
        }
      }
    } catch (_) {}
  }

  Future<void> fetchProducts() async {
    _isLoading = true;
    notifyListeners();

    try {
      final res = await ApiService.get(ApiConfig.products);
      if (res.success && res.data != null && res.data['products'] != null) {
        final list = (res.data['products'] as List)
            .map((p) => ProductModel.fromJson(p as Map<String, dynamic>))
            .toList();
        if (list.isNotEmpty) {
          _products = list;
          _featuredProducts = list.where((p) => p.isFeatured).toList();
        }
      }
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Admin local updates (synced with API in AdminProvider)
  void addProductLocal(ProductModel product) {
    _products.insert(0, product);
    if (product.isFeatured) _featuredProducts.insert(0, product);
    notifyListeners();
  }

  void updateProductLocal(ProductModel product) {
    final idx = _products.indexWhere((p) => p.id == product.id);
    if (idx != -1) {
      _products[idx] = product;
    }
    final fIdx = _featuredProducts.indexWhere((p) => p.id == product.id);
    if (product.isFeatured) {
      if (fIdx != -1) {
        _featuredProducts[fIdx] = product;
      } else {
        _featuredProducts.insert(0, product);
      }
    } else {
      if (fIdx != -1) _featuredProducts.removeAt(fIdx);
    }
    notifyListeners();
  }

  void deleteProductLocal(int productId) {
    _products.removeWhere((p) => p.id == productId);
    _featuredProducts.removeWhere((p) => p.id == productId);
    notifyListeners();
  }
}
