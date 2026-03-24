class Category {
  final int id;
  final String name;
  final String type;
  final String icon;
  final String color;

  const Category({
    required this.id,
    required this.name,
    required this.type,
    required this.icon,
    required this.color,
  });

  @override
  String toString() => name;
}
