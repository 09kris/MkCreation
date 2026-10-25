import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../models/product_model.dart';
import '../../providers/admin_provider.dart';
import '../../providers/product_provider.dart';

class AdminProductFormScreen extends StatefulWidget {
  final ProductModel? productToEdit;
  const AdminProductFormScreen({super.key, this.productToEdit});

  @override
  State<AdminProductFormScreen> createState() => _AdminProductFormScreenState();
}

class _AdminProductFormScreenState extends State<AdminProductFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _descController;
  late TextEditingController _priceController;
  late TextEditingController _discountPriceController;
  late TextEditingController _stockController;
  late TextEditingController _unitController;
  late TextEditingController _imageController;

  int? _selectedCategoryId;
  bool _isFeatured = false;

  @override
  void initState() {
    super.initState();
    final p = widget.productToEdit;
    _nameController = TextEditingController(text: p?.name ?? '');
    _descController = TextEditingController(text: p?.description ?? '');
    _priceController = TextEditingController(text: p != null ? p.price.toStringAsFixed(0) : '');
    _discountPriceController = TextEditingController(text: p?.discountPrice != null ? p!.discountPrice!.toStringAsFixed(0) : '');
    _stockController = TextEditingController(text: p != null ? p.stockQuantity.toString() : '50');
    _unitController = TextEditingController(text: p?.unit ?? 'Piece');
    _imageController = TextEditingController(
      text: p?.imageUrl ?? 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=600&q=80',
    );
    _selectedCategoryId = p?.categoryId ?? 1;
    _isFeatured = p?.isFeatured ?? false;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descController.dispose();
    _priceController.dispose();
    _discountPriceController.dispose();
    _stockController.dispose();
    _unitController.dispose();
    _imageController.dispose();
    super.dispose();
  }

  void _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedCategoryId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a category.')),
      );
      return;
    }

    final adminProv = Provider.of<AdminProvider>(context, listen: false);
    final productProv = Provider.of<ProductProvider>(context, listen: false);

    final price = double.tryParse(_priceController.text.trim()) ?? 0.0;
    final discountPrice = _discountPriceController.text.trim().isNotEmpty
        ? double.tryParse(_discountPriceController.text.trim())
        : null;
    final stock = int.tryParse(_stockController.text.trim()) ?? 0;

    final savedProduct = await adminProv.saveProduct(
      id: widget.productToEdit?.id,
      categoryId: _selectedCategoryId!,
      name: _nameController.text.trim(),
      description: _descController.text.trim(),
      price: price,
      discountPrice: discountPrice,
      stockQuantity: stock,
      unit: _unitController.text.trim(),
      imageUrl: _imageController.text.trim(),
      isFeatured: _isFeatured,
    );

    if (savedProduct != null && mounted) {
      if (widget.productToEdit != null) {
        productProv.updateProductLocal(savedProduct);
      } else {
        productProv.addProductLocal(savedProduct);
      }
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(widget.productToEdit != null ? 'Product updated successfully!' : 'New product added successfully!'),
          backgroundColor: Colors.green,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final productProv = Provider.of<ProductProvider>(context);
    final adminProv = Provider.of<AdminProvider>(context);
    final isEditing = widget.productToEdit != null;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppTheme.maroonAccent,
        title: Text(isEditing ? 'Edit Sacred Item' : 'Add New Sacred Item'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(18),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'General Information',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textDark),
                      ),
                      const SizedBox(height: 14),

                      // Name
                      TextFormField(
                        controller: _nameController,
                        decoration: const InputDecoration(labelText: 'Product Name *'),
                        validator: (v) => (v == null || v.trim().isEmpty) ? 'Please enter product name' : null,
                      ),
                      const SizedBox(height: 14),

                      // Category Dropdown
                      DropdownButtonFormField<int>(
                        initialValue: _selectedCategoryId,
                        decoration: const InputDecoration(labelText: 'Category *'),
                        items: productProv.categories.map((cat) {
                          return DropdownMenuItem<int>(
                            value: cat.id,
                            child: Row(
                              children: [
                                Icon(cat.iconData, size: 18, color: AppTheme.saffronPrimary),
                                const SizedBox(width: 8),
                                Text(cat.name),
                              ],
                            ),
                          );
                        }).toList(),
                        onChanged: (val) => setState(() => _selectedCategoryId = val),
                      ),
                      const SizedBox(height: 14),

                      // Description
                      TextFormField(
                        controller: _descController,
                        maxLines: 3,
                        decoration: const InputDecoration(labelText: 'Sacred Description & Details'),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Pricing & Inventory Card
              Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Pricing & Stock (₹ INR)',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textDark),
                      ),
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _priceController,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(labelText: 'MRP / Price (₹) *', prefixText: '₹ '),
                              validator: (v) => (v == null || v.trim().isEmpty) ? 'Enter price' : null,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: _discountPriceController,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(labelText: 'Offer Price (₹)', prefixText: '₹ '),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _stockController,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(labelText: 'Stock Units *'),
                              validator: (v) => (v == null || v.trim().isEmpty) ? 'Enter stock count' : null,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: _unitController,
                              decoration: const InputDecoration(labelText: 'Packaging Unit (e.g. Jar 200g, Pack)'),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Media & Display Settings
              Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Media & Featured Display',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textDark),
                      ),
                      const SizedBox(height: 14),
                      TextFormField(
                        controller: _imageController,
                        decoration: const InputDecoration(
                          labelText: 'Product Image URL',
                          hintText: 'https://...',
                          prefixIcon: Icon(Icons.image_outlined, color: AppTheme.saffronPrimary),
                        ),
                        onChanged: (_) => setState(() {}),
                      ),
                      const SizedBox(height: 14),

                      // Image Preview
                      if (_imageController.text.isNotEmpty)
                        Center(
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Image.network(
                              _imageController.text.trim(),
                              height: 120,
                              width: 120,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) => Container(
                                height: 100,
                                width: 100,
                                color: Colors.grey.shade200,
                                child: const Icon(Icons.broken_image_rounded, color: Colors.grey),
                              ),
                            ),
                          ),
                        ),

                      const SizedBox(height: 14),

                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Feature on Storefront Homepage'),
                        subtitle: const Text('Highlight under sacred collection', style: TextStyle(fontSize: 12)),
                        value: _isFeatured,
                        activeThumbColor: AppTheme.saffronPrimary,
                        onChanged: (val) => setState(() => _isFeatured = val),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 24),

              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.maroonAccent,
                  minimumSize: const Size.fromHeight(50),
                ),
                onPressed: adminProv.isLoading ? null : _submit,
                child: adminProv.isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : Text(isEditing ? 'Save Product Changes' : 'Create & Publish Sacred Item'),
              ),

              const SizedBox(height: 30),
            ],
          ),
        ),
      ),
    );
  }
}
