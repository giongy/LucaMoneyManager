class Account {
  final int id;
  final String name;
  final String icon;
  final String color;
  final double balance;
  final String currency;
  final bool isFavorite;

  const Account({
    required this.id,
    required this.name,
    required this.icon,
    required this.color,
    required this.balance,
    required this.currency,
    this.isFavorite = false,
  });
}
