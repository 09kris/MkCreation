import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../config/app_theme.dart';
import '../../models/order_model.dart';
import '../../providers/admin_provider.dart';

class AdminOrdersScreen extends StatefulWidget {
  const AdminOrdersScreen({super.key});

  @override
  State<AdminOrdersScreen> createState() => _AdminOrdersScreenState();
}

class _AdminOrdersScreenState extends State<AdminOrdersScreen> {
  final List<String> _statuses = ['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

  void _showStatusUpdateDialog(BuildContext context, OrderModel order, AdminProvider adminProv) {
    String selected = order.orderStatus;

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Update Fulfillment Status',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textDark),
                          ),
                          Text('Order ${order.orderNumber}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                        ],
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Wrap(
                    spacing: 8,
                    runSpacing: 10,
                    children: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) {
                      final isSelected = selected == status;
                      Color statusColor;
                      switch (status) {
                        case 'pending':
                          statusColor = Colors.orange;
                          break;
                        case 'confirmed':
                          statusColor = Colors.blue;
                          break;
                        case 'processing':
                          statusColor = Colors.purple;
                          break;
                        case 'shipped':
                          statusColor = Colors.indigo;
                          break;
                        case 'delivered':
                          statusColor = Colors.green;
                          break;
                        default:
                          statusColor = Colors.red;
                      }

                      return ChoiceChip(
                        label: Text(
                          status.toUpperCase(),
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: isSelected ? Colors.white : statusColor,
                          ),
                        ),
                        selected: isSelected,
                        selectedColor: statusColor,
                        backgroundColor: statusColor.withAlpha(20),
                        onSelected: (val) {
                          if (val) setModalState(() => selected = status);
                        },
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.maroonAccent,
                      minimumSize: const Size.fromHeight(48),
                    ),
                    onPressed: () async {
                      Navigator.pop(ctx);
                      final success = await adminProv.updateOrderStatus(order.id, selected);
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(success
                                ? 'Order status updated to ${selected.toUpperCase()} successfully!'
                                : 'Failed to update order status.'),
                            backgroundColor: success ? Colors.green : Colors.red,
                          ),
                        );
                      }
                    },
                    child: const Text('Save Order Status'),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final adminProv = Provider.of<AdminProvider>(context);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppTheme.maroonAccent,
        title: const Text('Manage Customer Orders'),
      ),
      body: Column(
        children: [
          // Filter Chips Horizontal List
          Container(
            height: 52,
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 14),
              itemCount: _statuses.length,
              itemBuilder: (context, index) {
                final st = _statuses[index];
                final isSelected = adminProv.selectedStatusFilter == st;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text(st == 'all' ? 'All Orders' : st.toUpperCase()),
                    selected: isSelected,
                    selectedColor: AppTheme.maroonAccent.withAlpha(35),
                    labelStyle: TextStyle(
                      fontSize: 11,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      color: isSelected ? AppTheme.maroonAccent : Colors.black87,
                    ),
                    onSelected: (val) {
                      if (val) adminProv.setStatusFilter(st);
                    },
                  ),
                );
              },
            ),
          ),

          // Orders List
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => adminProv.fetchAllOrders(status: adminProv.selectedStatusFilter),
              child: adminProv.allOrders.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.inbox_rounded, size: 54, color: Colors.grey),
                          const SizedBox(height: 12),
                          Text('No orders in "${adminProv.selectedStatusFilter}" status.'),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: adminProv.allOrders.length,
                      itemBuilder: (context, index) {
                        final order = adminProv.allOrders[index];
                        final formattedDate = DateFormat('dd MMM yyyy, hh:mm a').format(order.createdAt);

                        return Card(
                          margin: const EdgeInsets.only(bottom: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Order ID and Status
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          order.orderNumber,
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                        ),
                                        Text(formattedDate, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                                      ],
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: order.statusColor.withAlpha(25),
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border.all(color: order.statusColor),
                                      ),
                                      child: Text(
                                        order.statusDisplay,
                                        style: TextStyle(
                                          color: order.statusColor,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 11,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),

                                const Divider(height: 20),

                                // Customer & Address Info
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Icon(Icons.person_pin_rounded, size: 18, color: AppTheme.maroonAccent),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            '${order.shippingName} (${order.shippingPhone})',
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                          ),
                                          Text(
                                            '${order.shippingAddress}, ${order.shippingCity}, ${order.shippingState} - ${order.shippingPincode}',
                                            style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),

                                const SizedBox(height: 10),

                                // Items Breakdown
                                ...order.items.map(
                                  (item) => Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 2),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text('• ${item.quantity}x ${item.productName}', style: const TextStyle(fontSize: 12)),
                                        Text('₹${item.totalPrice.toStringAsFixed(0)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                                      ],
                                    ),
                                  ),
                                ),

                                const Divider(height: 20),

                                // Payment Info & Actions
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text('Payment: ${order.paymentMethod}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                                        Text(
                                          'Final: ₹${order.finalAmount.toStringAsFixed(0)}',
                                          style: const TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.bold,
                                            color: Color(0xFFBF360C),
                                          ),
                                        ),
                                      ],
                                    ),
                                    ElevatedButton.icon(
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: AppTheme.maroonAccent,
                                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                      ),
                                      icon: const Icon(Icons.edit_note_rounded, size: 18),
                                      label: const Text('Update Status', style: TextStyle(fontSize: 12)),
                                      onPressed: () => _showStatusUpdateDialog(context, order, adminProv),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
