import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../models/product_model.dart';
import '../../providers/admin_provider.dart';
import '../../providers/product_provider.dart';
import 'admin_product_form_screen.dart';

class AdminProductsScreen extends StatefulWidget {
  const AdminProductsScreen({super.key});

  @override
  State<AdminProductsScreen> createState() => _AdminProductsScreenState();
}

class _AdminProductsScreenState extends State<AdminProductsScreen> {
  String _searchFilter = '';

  @override
  Widget build(BuildContext context) {
    final productProv = Provider.of<ProductProvider>(context);
    final adminProv = Provider.of<AdminProvider>(context);

    final filteredProducts = productProv.allProducts.where((p) {
      if (_searchFilter.isEmpty) return true;
      return p.name.toLowerCase().contains(_searchFilter.toLowerCase()) ||
          (p.categoryName != null && p.categoryName!.toLowerCase().contains(_searchFilter.toLowerCase()));
    }).toList();

    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppTheme.maroonAccent,
        title: const Text('Inventory & Products'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => productProv.fetchProducts(),
          ),
          const SizedBox(width: 8),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppTheme.saffronPrimary,
        icon: const Icon(Icons.add_rounded, color: Colors.white),
        label: const Text('Add Product', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const AdminProductFormScreen()),
          );
        },
      ),
      body: Column(
        children: [
          // Search Input
          Container(
            color: Colors.white,
            padding: const EdgeInsets.all(12),
            child: TextField(
              onChanged: (val) => setState(() => _searchFilter = val.trim()),
              decoration: InputDecoration(
                hintText: 'Search items by name or category...',
                prefixIcon: const Icon(Icons.search_rounded, color: AppTheme.maroonAccent),
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
                fillColor: const Color(0xFFF9F9F9),
                filled: true,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey.shade300),
                ),
              ),
            ),
          ),

          // Total count bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: const Color(0xFFFAF7F0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${filteredProducts.length} Items Listed',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.textDark),
                ),
                Text(
                  '${filteredProducts.where((p) => p.isLowStock).length} Low Stock',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.red),
                ),
              ],
            ),
          ),

          // Product List
          Expanded(
            child: filteredProducts.isEmpty
                ? const Center(child: Text('No products found.'))
                : ListView.builder(
                    padding: const EdgeInsets.all(14),
                    itemCount: filteredProducts.length,
                    itemBuilder: (context, index) {
                      final product = filteredProducts[index];
                      return _buildProductListItem(context, product, adminProv, productProv);
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildProductListItem(
    BuildContext context,
    ProductModel product,
    AdminProvider adminProv,
    ProductProvider productProv,
  ) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Thumbnail
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: Container(
                width: 64,
                height: 64,
                color: const Color(0xFFFAF7F0),
                child: (product.imageUrl != null && product.imageUrl!.isNotEmpty)
                    ? Image.network(
                        product.imageUrl!,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) => const Icon(
                          Icons.temple_hindu_rounded,
                          color: AppTheme.saffronPrimary,
                        ),
                      )
                    : const Icon(Icons.temple_hindu_rounded, color: AppTheme.saffronPrimary),
              ),
            ),
            const SizedBox(width: 14),

            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.categoryName ?? 'Pooja Item',
                    style: const TextStyle(fontSize: 10, color: AppTheme.saffronPrimary, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    product.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text(
                        '₹${product.effectivePrice.toStringAsFixed(0)}',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFFBF360C)),
                      ),
                      const SizedBox(width: 6),
                      Text('• ${product.unit}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                    ],
                  ),
                  const SizedBox(height: 6),

                  // Stock Chip
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: product.isLowStock ? Colors.red.withAlpha(20) : Colors.green.withAlpha(20),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: product.isLowStock ? Colors.red : Colors.green),
                    ),
                    child: Text(
                      'Stock: ${product.stockQuantity} ${product.isLowStock ? '(LOW)' : ''}',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: product.isLowStock ? Colors.red : Colors.green[800],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Actions: Edit and Delete
            Column(
              children: [
                IconButton(
                  icon: const Icon(Icons.edit_outlined, color: AppTheme.maroonAccent, size: 20),
                  tooltip: 'Edit Product',
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => AdminProductFormScreen(productToEdit: product),
                      ),
                    );
                  },
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline, color: Colors.red, size: 20),
                  tooltip: 'Delete Product',
                  onPressed: () {
                    showDialog(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        title: const Text('Delete Product?'),
                        content: Text('Are you sure you want to delete "${product.name}"?'),
                        actions: [
                          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                            onPressed: () async {
                              Navigator.pop(ctx);
                              final ok = await adminProv.deleteProduct(product.id);
                              if (ok) {
                                productProv.deleteProductLocal(product.id);
                              }
                            },
                            child: const Text('Delete'),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
