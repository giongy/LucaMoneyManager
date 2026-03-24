import 'package:flutter/material.dart';
import 'screens/home_screen.dart';

void main() => runApp(const LucaWalletApp());

class LucaWalletApp extends StatelessWidget {
  const LucaWalletApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Luca Wallet',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF58a6ff),
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      home: const HomeScreen(),
    );
  }
}
