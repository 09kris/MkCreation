import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../config/app_theme.dart';
import '../../models/order_model.dart';
import '../../providers/order_provider.dart';

class MyOrdersScreen extends StatelessWidget {
  const MyOrdersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final orderProv = Provider.of<OrderProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Pooja Orders'),
      ),
      body: RefreshIndicator(
        onRefresh: () => orderProv.fetchMyOrders(),
        child: orderProv.myOrders.isEmpty
            ? Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: AppTheme.saffronPrimary.withAlpha(20),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.receipt_long_rounded, size: 64, color: AppTheme.saffronPrimary),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'No Orders Placed Yet',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textDark),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'When you place orders for pooja samagri or sacred items, you can track their status here.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 13, color: AppTheme.textMuted),
                      ),
                    ],
                  ),
                ),
              )
            : ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: orderProv.myOrders.length,
                itemBuilder: (context, index) {
                  final order = orderProv.myOrders[index];
                  return _buildOrderCard(context, order);
                },
              ),
      ),
    );
  }

  Widget _buildOrderCard(BuildContext context, OrderModel order) {
    final formattedDate = DateFormat('dd MMM yyyy, hh:mm a').format(order.createdAt);

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Order Number & Status Badge
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      order.orderNumber,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.textDark),
                    ),
                    const SizedBox(height: 2),
                    Text(formattedDate, style: const TextStyle(fontSize: 11, color: AppTheme.textMuted)),
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
                    style: TextStyle(color: order.statusColor, fontWeight: FontWeight.bold, fontSize: 11),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 14),

            // Order Fulfillment Progress Indicator
            _buildTimelineProgress(order.orderStatus),

            const Divider(height: 22),

            // Item List preview
            ...order.items.map(
              (item) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        width: 44,
                        height: 44,
                        color: const Color(0xFFFAF7F0),
                        child: (item.imageUrl != null && item.imageUrl!.isNotEmpty)
                            ? Image.network(
                                item.imageUrl!,
                                fit: BoxFit.cover,
                                errorBuilder: (context, error, stackTrace) => const Icon(
                                  Icons.temple_hindu_rounded,
                                  size: 22,
                                  color: AppTheme.saffronPrimary,
                                ),
                              )
                            : const Icon(Icons.temple_hindu_rounded, size: 22, color: AppTheme.saffronPrimary),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.productName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                          ),
                          Text(
                            'Qty: ${item.quantity}  •  ₹${item.price.toStringAsFixed(0)} each',
                            style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      '₹${item.totalPrice.toStringAsFixed(0)}',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  ],
                ),
              ),
            ),

            const Divider(height: 16),

            // Shipping & Total
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.location_on_outlined, size: 16, color: AppTheme.textMuted),
                    const SizedBox(width: 4),
                    Text(
                      '${order.shippingCity}, ${order.shippingState}',
                      style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
                    ),
                  ],
                ),
                Text(
                  'Total: ₹${order.finalAmount.toStringAsFixed(0)}',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFFBF360C),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTimelineProgress(String status) {
    int currentStep = 0;
    if (status == 'confirmed') currentStep = 1;
    if (status == 'processing') currentStep = 2;
    if (status == 'shipped') currentStep = 3;
    if (status == 'delivered') currentStep = 4;
    if (status == 'cancelled') currentStep = -1;

    final steps = ['Placed', 'Confirmed', 'Processing', 'Shipped', 'Delivered'];

    if (currentStep == -1) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(color: Colors.red.withAlpha(20), borderRadius: BorderRadius.circular(8)),
        child: const Row(
          children: [
            Icon(Icons.cancel_rounded, color: Colors.red, size: 16),
            SizedBox(width: 6),
            Text('This pooja order was cancelled.', style: TextStyle(color: Colors.red, fontSize: 12)),
          ],
        ),
      );
    }

    return Row(
      children: List.generate(steps.length * 2 - 1, (index) {
        if (index.isOdd) {
          // Connector line
          final lineIndex = index ~/ 2;
          final isCompleted = lineIndex < currentStep;
          return Expanded(
            child: Container(
              height: 2.5,
              color: isCompleted ? AppTheme.saffronPrimary : Colors.grey.shade300,
            ),
          );
        } else {
          // Step circle
          final stepIndex = index ~/ 2;
          final isCompleted = stepIndex <= currentStep;
          return Column(
            children: [
              Container(
                width: 14,
                height: 14,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isCompleted ? AppTheme.saffronPrimary : Colors.white,
                  border: Border.all(
                    color: isCompleted ? AppTheme.saffronPrimary : Colors.grey.shade400,
                    width: 2,
                  ),
                ),
              ),
              const SizedBox(height: 3),
              Text(
                steps[stepIndex],
                style: TextStyle(
                  fontSize: 9,
                  fontWeight: isCompleted ? FontWeight.bold : FontWeight.normal,
                  color: isCompleted ? AppTheme.saffronPrimary : Colors.grey,
                ),
              ),
            ],
          );
        }
      }),
    );
  }
}
