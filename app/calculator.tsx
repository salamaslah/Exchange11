import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { currencyService } from '@/lib/supabase';

export default function CalculatorScreen() {
  const [allCurrencies, setAllCurrencies] = useState<any[]>([]);
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('ILS');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [language, setLanguage] = useState<'ar' | 'he' | 'en'>('ar');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadLanguage();
    loadCurrencies();
    loadPreselectedCurrencies();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('selectedLanguage');
      if (savedLanguage && ['ar', 'he', 'en'].includes(savedLanguage)) {
        setLanguage(savedLanguage as 'ar' | 'he' | 'en');
      }
    } catch (error) {
      console.log('خطأ في تحميل اللغة:', error);
    }
  };

  const loadCurrencies = async () => {
    try {
      setLoading(true);
      const currencies = await currencyService.getAll();
      setAllCurrencies(currencies);
    } catch (error) {
      console.error('خطأ في تحميل العملات:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPreselectedCurrencies = async () => {
    try {
      const savedFromCurrency = await AsyncStorage.getItem('calculatorFromCurrency');
      const savedToCurrency = await AsyncStorage.getItem('calculatorToCurrency');

      if (savedFromCurrency) {
        setFromCurrency(savedFromCurrency);
        await AsyncStorage.removeItem('calculatorFromCurrency');
      }

      if (savedToCurrency) {
        setToCurrency(savedToCurrency);
        await AsyncStorage.removeItem('calculatorToCurrency');
      }
    } catch (error) {
      console.log('خطأ في تحميل العملات المحفوظة:', error);
    }
  };

  const calculatorCurrencies = [
    { code: 'ILS', name_ar: 'شيقل إسرائيلي', name_en: 'Israeli Shekel', name_he: 'שקל ישראלי' },
    ...allCurrencies.filter(c => c.is_active)
  ];

  const calculateConversion = (amount: string, from: string, to: string, isFromAmount: boolean) => {
    if (!amount || amount === '' || parseFloat(amount) === 0) {
      if (isFromAmount) {
        setToAmount('');
      } else {
        setFromAmount('');
      }
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) {
      return;
    }

    if (from === to) {
      if (isFromAmount) {
        setToAmount(amount);
      } else {
        setFromAmount(amount);
      }
      return;
    }

    const fromCurrencyData = allCurrencies.find(c => c.code === from);
    const toCurrencyData = allCurrencies.find(c => c.code === to);

    let result = 0;

    if (from === 'ILS' && toCurrencyData) {
      result = amountNum / toCurrencyData.sell_rate;
    } else if (to === 'ILS' && fromCurrencyData) {
      result = amountNum * fromCurrencyData.buy_rate;
    } else if (fromCurrencyData && toCurrencyData) {
      const amountInILS = amountNum * fromCurrencyData.buy_rate;
      result = amountInILS / toCurrencyData.sell_rate;
    }

    if (isFromAmount) {
      setToAmount(result.toFixed(2));
    } else {
      setFromAmount(result.toFixed(2));
    }
  };

  const handleFromAmountChange = (text: string) => {
    setFromAmount(text);
    calculateConversion(text, fromCurrency, toCurrency, true);
  };

  const handleToAmountChange = (text: string) => {
    setToAmount(text);
    calculateConversion(text, toCurrency, fromCurrency, false);
  };

  const handleFromCurrencyChange = (currency: string) => {
    setFromCurrency(currency);
    calculateConversion(fromAmount, currency, toCurrency, true);
  };

  const handleToCurrencyChange = (currency: string) => {
    setToCurrency(currency);
    calculateConversion(fromAmount, fromCurrency, currency, true);
  };

  const handleSwapCurrencies = () => {
    const tempCurrency = fromCurrency;
    const tempAmount = fromAmount;

    setFromCurrency(toCurrency);
    setToCurrency(tempCurrency);
    setFromAmount(toAmount);
    setToAmount(tempAmount);
  };

  const handleConfirmTransaction = async () => {
    if (!fromAmount || !toAmount || parseFloat(fromAmount) === 0 || parseFloat(toAmount) === 0) {
      Alert.alert(
        language === 'ar' ? 'خطأ' : language === 'he' ? 'שגיאה' : 'Error',
        language === 'ar' ? 'يرجى إدخال المبالغ' :
        language === 'he' ? 'אנא הזן סכומים' :
        'Please enter amounts'
      );
      return;
    }

    const fromCurrencyData = calculatorCurrencies.find(c => c.code === fromCurrency);
    const toCurrencyData = calculatorCurrencies.find(c => c.code === toCurrency);

    const calculatorTransactionData = {
      fromCurrency,
      toCurrency,
      fromAmount,
      toAmount,
      exchangeRate: (parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(4),
      fromCurrencyName: fromCurrencyData ? (language === 'ar' ? fromCurrencyData.name_ar : language === 'he' ? fromCurrencyData.name_he : fromCurrencyData.name_en) : fromCurrency,
      toCurrencyName: toCurrencyData ? (language === 'ar' ? toCurrencyData.name_ar : language === 'he' ? toCurrencyData.name_he : toCurrencyData.name_en) : toCurrency,
    };

    await AsyncStorage.setItem('fromCalculator', 'true');
    await AsyncStorage.setItem('calculatorData', JSON.stringify(calculatorTransactionData));
    await AsyncStorage.setItem('calculatorTransactionReady', 'true');

    console.log('✅ تم حفظ بيانات الآلة الحاسبة:', calculatorTransactionData);

    router.push('/(tabs)/customer-info');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>
            {language === 'ar' && 'جاري التحميل...'}
            {language === 'he' && 'טוען...'}
            {language === 'en' && 'Loading...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {language === 'ar' && 'آلة حاسبة العملات'}
            {language === 'he' && 'מחשבון מטבעות'}
            {language === 'en' && 'Currency Calculator'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          <View style={styles.conversionSection}>
            <Text style={styles.sectionLabel}>
              {language === 'ar' && 'من'}
              {language === 'he' && 'מ'}
              {language === 'en' && 'From'}
            </Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.amountInput}
                value={fromAmount}
                onChangeText={handleFromAmountChange}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.currencySelector}>
                {calculatorCurrencies.map(currency => (
                  <TouchableOpacity
                    key={currency.code}
                    style={[
                      styles.currencyButton,
                      fromCurrency === currency.code && styles.currencyButtonActive
                    ]}
                    onPress={() => handleFromCurrencyChange(currency.code)}
                  >
                    <Text style={[
                      styles.currencyButtonText,
                      fromCurrency === currency.code && styles.currencyButtonTextActive
                    ]}>
                      {currency.code}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <TouchableOpacity style={styles.swapButton} onPress={handleSwapCurrencies}>
            <Text style={styles.swapButtonText}>⇅</Text>
          </TouchableOpacity>

          <View style={styles.conversionSection}>
            <Text style={styles.sectionLabel}>
              {language === 'ar' && 'إلى'}
              {language === 'he' && 'ל'}
              {language === 'en' && 'To'}
            </Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.amountInput}
                value={toAmount}
                onChangeText={handleToAmountChange}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.currencySelector}>
                {calculatorCurrencies.map(currency => (
                  <TouchableOpacity
                    key={currency.code}
                    style={[
                      styles.currencyButton,
                      toCurrency === currency.code && styles.currencyButtonActive
                    ]}
                    onPress={() => handleToCurrencyChange(currency.code)}
                  >
                    <Text style={[
                      styles.currencyButtonText,
                      toCurrency === currency.code && styles.currencyButtonTextActive
                    ]}>
                      {currency.code}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirmTransaction}
          >
            <Text style={styles.confirmButtonText}>
              {language === 'ar' && 'تأكيد المعاملة'}
              {language === 'he' && 'אשר עסקה'}
              {language === 'en' && 'Confirm Transaction'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  },
  scrollContainer: {
    flex: 1,
    padding: 20,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0369A1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0369A1',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  conversionSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 10,
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  amountInput: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 15,
    textAlign: 'center',
  },
  currencySelector: {
    flexDirection: 'row',
  },
  currencyButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 10,
  },
  currencyButtonActive: {
    backgroundColor: '#0369A1',
  },
  currencyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  currencyButtonTextActive: {
    color: '#FFFFFF',
  },
  swapButton: {
    alignSelf: 'center',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0369A1',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  swapButtonText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  confirmButton: {
    backgroundColor: '#059669',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
