import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, SafeAreaView, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { customerService, transactionService } from '@/lib/supabase';

interface CustomerInfo {
  customer_name: string;
  national_id: string;
  phone_number: string;
  birth_date: string;
  image1_data?: string;
  image1_type?: string;
  image2_data?: string;
  image2_type?: string;
}

export default function CustomerInfoScreen() {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    customer_name: '',
    national_id: '',
    phone_number: '',
    birth_date: '',
    image1_data: '',
    image1_type: '',
    image2_data: '',
    image2_type: ''
  });
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);
  const [language, setLanguage] = useState<'ar' | 'he' | 'en'>('ar');
  const [selectedService, setSelectedService] = useState<any>(null);
  const [fromCalculator, setFromCalculator] = useState(false);
  const [calculatorData, setCalculatorData] = useState<any>(null);
  const [image1, setImage1] = useState<string | null>(null);
  const [image2, setImage2] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadInitialData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 تم تفعيل صفحة معلومات الزبائن - فحص البيانات...');
      loadLanguage();
    }, [])
  );

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('selectedLanguage');
      if (savedLanguage && ['ar', 'he', 'en'].includes(savedLanguage)) {
        setLanguage(savedLanguage as 'ar' | 'he' | 'en');
        console.log('✅ تم تحميل اللغة:', savedLanguage);
      }
    } catch (error) {
      console.log('خطأ في تحميل اللغة:', error);
    }
  };

  const loadInitialData = async () => {
    try {
      console.log('🔄 بدء تحميل البيانات الأولية...');
      
      // تحميل اللغة
      await loadLanguage();

      // مسح البيانات السابقة أولاً
      setCustomerInfo({
        customer_name: '',
        national_id: '',
        phone_number: '',
        birth_date: '',
        image1_data: '',
        image1_type: '',
        image2_data: '',
        image2_type: ''
      });
      setImage1(null);
      setImage2(null);
      setCustomerFound(false);
      setSelectedService(null);
      setFromCalculator(false);
      setCalculatorData(null);

      // فحص إذا كان قادماً من الآلة الحاسبة
      const isFromCalculator = await AsyncStorage.getItem('fromCalculator');
      const calculatorTransactionData = await AsyncStorage.getItem('calculatorData');
      
      console.log('🔍 فحص مصدر الوصول:');
      console.log('- fromCalculator:', isFromCalculator);
      console.log('- calculatorData exists:', !!calculatorTransactionData);
      
      if (isFromCalculator === 'true' && calculatorTransactionData) {
        console.log('📊 قادم من الآلة الحاسبة');
        setFromCalculator(true);
        setCalculatorData(JSON.parse(calculatorTransactionData));
        
        // تعيين الخدمة كصرافة أموال
        const exchangeService = {
          id: '8',
          service_number: 8,
          service_name: 'صرافة أموال',
          service_name_he: 'החלפת כספים',
          service_name_en: 'Money Exchange'
        };
        setSelectedService(exchangeService);
        console.log('✅ تم تعيين الخدمة: صرافة أموال');
      } else {
        // تحميل الخدمة المختارة من صفحة الخدمات
        const serviceNumber = await AsyncStorage.getItem('selectedServiceNumber');
        const serviceName = await AsyncStorage.getItem('selectedServiceName');
        const serviceNameHe = await AsyncStorage.getItem('selectedServiceNameHe');
        const serviceNameEn = await AsyncStorage.getItem('selectedServiceNameEn');
        
        console.log('🔍 فحص الخدمة المختارة من AsyncStorage:');
        console.log('- selectedServiceNumber:', serviceNumber);
        console.log('- selectedServiceName:', serviceName);
        console.log('- selectedServiceNameHe:', serviceNameHe);
        console.log('- selectedServiceNameEn:', serviceNameEn);
        
        if (serviceNumber && serviceName) {
          const serviceNum = parseInt(serviceNumber);
          console.log('🔄 إنشاء كائن الخدمة للرقم:', serviceNum);
          
          const service = {
            id: serviceNum.toString(),
            service_number: serviceNum,
            service_name: serviceName,
            service_name_he: serviceNameHe || '',
            service_name_en: serviceNameEn || ''
          };
          setSelectedService(service);
          console.log('✅ تم تحميل الخدمة المختارة:', service.service_name);
          console.log('📊 تفاصيل الخدمة الكاملة:', service);
        } else {
          console.log('⚠️ لم يتم العثور على خدمة محددة');
        }
      }
    } catch (error) {
      console.error('❌ خطأ في تحميل البيانات:', error);
    }
  };

  const searchCustomerByNationalId = async (nationalId: string) => {
    if (nationalId.length !== 9) {
      setCustomerFound(false);
      return;
    }

    try {
      setSearching(true);
      console.log(`🔍 البحث عن زبون برقم الهوية: ${nationalId}`);
      
      const customer = await customerService.getByNationalId(nationalId);
      
      if (customer) {
        console.log(`✅ تم العثور على الزبون: ${customer.customer_name}`);
        
        // ملء البيانات تلقائياً
        setCustomerInfo({
          customer_name: customer.customer_name,
          national_id: customer.national_id,
          phone_number: customer.phone_number || '',
          birth_date: customer.birth_date,
          image1_data: customer.image1_data || customerInfo.image1_data || '',
          image1_type: customer.image1_type || customerInfo.image1_type || '',
          image2_data: customer.image2_data || customerInfo.image2_data || '',
          image2_type: customer.image2_type || customerInfo.image2_type || ''
        });

        // تحميل الصور إذا كانت متوفرة
        if (customer.image1_data && customer.image1_data.trim()) {
          setImage1(customer.image1_data);
        }
        if (customer.image2_data && customer.image2_data.trim()) {
          setImage2(customer.image2_data);
        }

        setCustomerFound(true);
        
        // إظهار رسالة تأكيد
        Alert.alert(
          language === 'ar' ? '✅ تم العثور على الزبون' : 
          language === 'he' ? '✅ הלקוח נמצא' : 
          '✅ Customer Found',
          
          language === 'ar' ? `تم تحميل بيانات الزبون: ${customer.customer_name}` :
          language === 'he' ? `נטענו פרטי הלקוח: ${customer.customer_name}` :
          `Customer data loaded: ${customer.customer_name}`
        );
      } else {
        console.log('📝 لم يتم العثور على الزبون');
        setCustomerFound(false);
        
        // مسح البيانات عدا رقم الهوية
        setCustomerInfo(prev => ({
          customer_name: '',
          national_id: prev.national_id,
          phone_number: '',
          birth_date: '',
          image1_data: '',
          image1_type: '',
          image2_data: '',
          image2_type: ''
        }));
        setImage1(null);
        setImage2(null);
      }
    } catch (error) {
      console.error('❌ خطأ في البحث عن الزبون:', error);
      setCustomerFound(false);
    } finally {
      setSearching(false);
    }
  };

  const handleNationalIdChange = (text: string) => {
    // السماح بالأرقام فقط
    const numericText = text.replace(/[^0-9]/g, '');
    
    setCustomerInfo(prev => ({ ...prev, national_id: numericText }));
    
    // البحث التلقائي عند إكمال 9 أرقام
    if (numericText.length === 9) {
      searchCustomerByNationalId(numericText);
    } else {
      setCustomerFound(false);
      setSearching(false);
    }
  };

  const getServiceNameInLanguage = (serviceNumber: number, lang: 'ar' | 'he' | 'en'): string => {
    const serviceNames = {
      1: { ar: 'إنشاء فيزا', he: 'יצירת כרטיס', en: 'Create Card' },
      2: { ar: 'تحويل للخارج', he: 'העברה לחו"ל', en: 'International Transfer' },
      3: { ar: 'سحب حوالة', he: 'משיכת העברה', en: 'Receive Transfer' },
      4: { ar: 'صرافة شيكات', he: 'פדיון צ\'קים', en: 'Check Cashing' },
      5: { ar: 'تحويل لحساب بنك صاحب المحل', he: 'העברה לחשבון הבנק', en: 'Bank Account Transfer' },
      6: { ar: 'سحب من الفيزا', he: 'משיכה מכרטיס', en: 'Card Withdrawal' },
      7: { ar: 'إيداع في الفيزا', he: 'הפקדה בכרטיס', en: 'Card Deposit' },
      8: { ar: 'صرافة أموال', he: 'החלפת כספים', en: 'Money Exchange' }
    };

    return serviceNames[serviceNumber as keyof typeof serviceNames]?.[lang] || 'خدمة غير معروفة';
  };

  const getDisplayedServiceName = (): string => {
    if (!selectedService) {
      return language === 'ar' ? 'خدمة غير محددة' :
             language === 'he' ? 'שירות לא מוגדר' :
             'Service Not Selected';
    }

    console.log(`🔤 عرض اسم الخدمة ${selectedService.service_number} باللغة ${language}`);
    console.log('📊 بيانات الخدمة:', {
      ar: selectedService.service_name,
      he: selectedService.service_name_he,
      en: selectedService.service_name_en
    });
    
    switch (language) {
      case 'he':
        const heName = selectedService.service_name_he || selectedService.service_name;
        console.log(`✅ عرض الاسم العبري: ${heName}`);
        return heName;
      case 'en':
        const enName = selectedService.service_name_en || selectedService.service_name;
        console.log(`✅ عرض الاسم الإنجليزي: ${enName}`);
        return enName;
      default:
        console.log(`✅ عرض الاسم العربي: ${selectedService.service_name}`);
        return selectedService.service_name;
    }
  };

  const getRequiredFields = () => {
    if (!selectedService) return { basic: true, phone: false, images: false };

    const serviceNumber = selectedService.service_number;

    switch (serviceNumber) {
      case 8: // صرافة أموال (من الآلة الحاسبة)
        return { basic: true, phone: false, images: false };
      
      case 1: // إنشاء فيزا
        return { basic: true, phone: true, images: true };
      
      case 7: // إيداع في الفيزا
        return { basic: true, phone: false, images: false };
      
      case 2: // تحويل للخارج
      case 4: // صرافة شيكات
      case 5: // تحويل لحساب بنك
      case 6: // سحب من الفيزا
        return { basic: true, phone: true, images: true };
      
      case 3: // سحب حوالة
        return { basic: true, phone: true, images: true };
      
      default:
        return { basic: true, phone: false, images: false };
    }
  };

  const getImage1Label = () => {
    switch (language) {
      case 'he': return 'תמונת תעודת זהות';
      case 'en': return 'ID Photo';
      default: return 'صورة الهوية';
    }
  };

  const getImage2Label = () => {
    if (!selectedService) return 'صورة إضافية';
    
    const serviceNumber = selectedService.service_number;
    
    switch (serviceNumber) {
      case 1: // إنشاء فيزا
        switch (language) {
          case 'he': return 'תמונת רישיון נהיגה';
          case 'en': return 'Driver License Photo';
          default: return 'صورة رخصة القيادة';
        }
      
      case 4: // صرافة شيكات
      case 5: // تحويل لحساب بنك
      case 6: // سحب من الفيزا
        switch (language) {
          case 'he': return 'תמונת רישיון נהיגה';
          case 'en': return 'Driver License Photo';
          default: return 'صورة رخصة القيادة';
        }
      
      case 2: // تحويل للخارج
        switch (language) {
          case 'he': return 'תמונת דרכון הנמען';
          case 'en': return 'Recipient Passport Photo';
          default: return 'صورة جواز سفر المرسل إليه';
        }
      
      case 3: // سحب حوالة
        switch (language) {
          case 'he': return 'תמונת רישיון נהיגה';
          case 'en': return 'Driver License Photo';
          default: return 'صورة رخصة القيادة';
        }
      
      default:
        switch (language) {
          case 'he': return 'תמונה נוספת';
          case 'en': return 'Additional Photo';
          default: return 'صورة إضافية';
        }
    }
  };

  const pickImage = async (imageNumber: 1 | 2) => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert(
          language === 'ar' ? 'إذن مطلوب' : language === 'he' ? 'נדרש אישור' : 'Permission Required',
          language === 'ar' ? 'نحتاج إذن للوصول للصور' : language === 'he' ? 'אנחנו צריכים אישור לגישה לתמונות' : 'We need permission to access photos'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        
        if (imageNumber === 1) {
          setImage1(imageUri);
          setCustomerInfo(prev => ({ ...prev, image1_data: imageUri, image1_type: 'image/jpeg' }));
          console.log('✅ تم اختيار الصورة الأولى:', imageUri);
        } else {
          setImage2(imageUri);
          setCustomerInfo(prev => ({ ...prev, image2_data: imageUri, image2_type: 'image/jpeg' }));
          console.log('✅ تم اختيار الصورة الثانية:', imageUri);
        }
      }
    } catch (error) {
      console.error('خطأ في اختيار الصورة:', error);
      Alert.alert(
        language === 'ar' ? 'خطأ' : language === 'he' ? 'שגיאה' : 'Error',
        language === 'ar' ? 'حدث خطأ في اختيار الصورة' : language === 'he' ? 'אירעה שגיאה בבחירת התמונה' : 'Error occurred while selecting image'
      );
    }
  };

  const removeImage = (imageNumber: 1 | 2) => {
    if (imageNumber === 1) {
      setImage1(null);
      setCustomerInfo(prev => ({ ...prev, image1_data: '', image1_type: '' }));
      console.log('🗑️ تم حذف الصورة الأولى');
    } else {
      setImage2(null);
      setCustomerInfo(prev => ({ ...prev, image2_data: '', image2_type: '' }));
      console.log('🗑️ تم حذف الصورة الثانية');
    }
  };

  const validateCustomerInfo = (): boolean => {
    const requiredFields = getRequiredFields();
    
    // التحقق من الحقول الأساسية
    if (!customerInfo.customer_name.trim()) {
      Alert.alert(
        language === 'ar' ? 'خطأ' : language === 'he' ? 'שגיאה' : 'Error',
        language === 'ar' ? 'يرجى إدخال اسم الزبون' : 
        language === 'he' ? 'אנא הכנס שם הלקוח' : 
        'Please enter customer name'
      );
      return false;
    }

    if (!customerInfo.national_id.trim() || customerInfo.national_id.length !== 9) {
      Alert.alert(
        language === 'ar' ? 'خطأ' : language === 'he' ? 'שגיאה' : 'Error',
        language === 'ar' ? 'يرجى إدخال رقم هوية صحيح (9 أرقام)' : 
        language === 'he' ? 'אנא הכנס מספר זהות תקין (9 ספרות)' : 
        'Please enter valid ID number (9 digits)'
      );
      return false;
    }

    if (!customerInfo.birth_date.trim()) {
      Alert.alert(
        language === 'ar' ? 'خطأ' : language === 'he' ? 'שגיאה' : 'Error',
        language === 'ar' ? 'يرجى إدخال تاريخ الميلاد' : 
        language === 'he' ? 'אנא הכנס תאריך לידה' : 
        'Please enter birth date'
      );
      return false;
    }

    // التحقق من رقم الهاتف إذا كان مطلوباً
    if (requiredFields.phone && !customerInfo.phone_number.trim()) {
      Alert.alert(
        language === 'ar' ? 'خطأ' : language === 'he' ? 'שגיאה' : 'Error',
        language === 'ar' ? 'يرجى إدخال رقم الهاتف' : 
        language === 'he' ? 'אנא הכנס מספר טלפון' : 
        'Please enter phone number'
      );
      return false;
    }

    // التحقق من الصور إذا كانت مطلوبة
    if (requiredFields.images) {
      if (!image1) {
        Alert.alert(
          language === 'ar' ? 'خطأ' : language === 'he' ? 'שגיאה' : 'Error',
          language === 'ar' ? 'يرجى رفع صورة الهوية' : 
          language === 'he' ? 'אנא העלה תמונת תעודת זהות' : 
          'Please upload ID photo'
        );
        return false;
      }

      if (!image2) {
        Alert.alert(
          language === 'ar' ? 'خطأ' : language === 'he' ? 'שגיאה' : 'Error',
          language === 'ar' ? `يرجى رفع ${getImage2Label()}` : 
          language === 'he' ? `אנא העלה ${getImage2Label()}` : 
          `Please upload ${getImage2Label()}`
        );
        return false;
      }
    }

    return true;
  };

  const navigateToServiceScreen = async () => {
    if (!selectedService) {
      Alert.alert('خطأ', 'لم يتم تحديد الخدمة');
      return;
    }

    const serviceNumber = selectedService.service_number;
    console.log(`🔄 الانتقال لصفحة الخدمة رقم ${serviceNumber}`);

    // الانتقال لصفحة الخدمة المناسبة
    switch (serviceNumber) {
      case 1:
        router.push('/services/visa-creation');
        break;
      case 2:
        router.push('/services/transfer');
        break;
      case 3:
        router.push('/services/remittance');
        break;
      case 4:
        router.push('/services/check');
        break;
      case 5:
        router.push('/services/bank');
        break;
      case 6:
        router.push('/services/withdraw');
        break;
      case 7:
        router.push('/services/deposit');
        break;
      case 8:
        router.push('/services/exchange');
        break;
      default:
        Alert.alert('خطأ', 'خدمة غير مدعومة');
    }
  };

  const showCalculatorTransactionMessage = () => {
    const fromCurrencyName = calculatorData.fromCurrency === 'ILS' ? 
      (language === 'ar' ? 'شيقل' : language === 'he' ? 'שקל' : 'Shekel') :
      calculatorData.fromCurrency;
    
    const toCurrencyName = calculatorData.toCurrency === 'ILS' ? 
      (language === 'ar' ? 'شيقل' : language === 'he' ? 'שקל' : 'Shekel') :
      calculatorData.toCurrency;

    Alert.alert(
      language === 'ar' ? '✅ تم تسجيل المعاملة بنجاح' : 
      language === 'he' ? '✅ העסקה נרשמה בהצלחה' : 
      '✅ Transaction Recorded Successfully',
      
      language === 'ar' ? 
        `🙏 شكراً لاختيارك محلنا\n\n` +
        `📋 يرجى التقدم إلى الشباك وانتظار دورك\n\n` +
        `تفاصيل المعاملة:\n` +
        `الزبون: ${customerInfo.customer_name}\n` +
        `من: ${calculatorData.fromAmount} ${fromCurrencyName}\n` +
        `إلى: ${calculatorData.toAmount} ${toCurrencyName}\n\n` +
        `✅ تم تسجيل المعاملة في النظام بنجاح` :
      
      language === 'he' ? 
        `🙏 תודה שבחרת בחנות שלנו\n\n` +
        `📋 אנא פנה לדלפק והמתן לתורך\n\n` +
        `פרטי העסקה:\n` +
        `לקוח: ${customerInfo.customer_name}\n` +
        `מ: ${calculatorData.fromAmount} ${fromCurrencyName}\n` +
        `ל: ${calculatorData.toAmount} ${toCurrencyName}\n\n` +
        `✅ העסקה נרשמה במערכת בהצלחה` :
      
        `🙏 Thank you for choosing our store\n\n` +
        `📋 Please proceed to the counter and wait for your turn\n\n` +
        `Transaction Details:\n` +
        `Customer: ${customerInfo.customer_name}\n` +
        `From: ${calculatorData.fromAmount} ${fromCurrencyName}\n` +
        `To: ${calculatorData.toAmount} ${toCurrencyName}\n\n` +
        `✅ Transaction recorded in system successfully`,
      
      [
        {
          text: language === 'ar' ? '🏠 العودة لأسعار اليوم' : 
                language === 'he' ? '🏠 חזרה למחירי היום' : 
                '🏠 Back to Today\'s Prices',
          onPress: () => router.replace('/(tabs)/prices')
        }
      ]
    );
  };

  const showVisaCreationMessage = () => {
    Alert.alert(
      language === 'ar' ? '✅ تم تسجيل طلب إنشاء الفيزا بنجاح' : 
      language === 'he' ? '✅ בקשת יצירת הכרטיס נרשמה בהצלחה' : 
      '✅ Card Creation Request Recorded Successfully',
      
      language === 'ar' ? 
        `🙏 شكراً لاختيارك محلنا\n\n` +
        `📋 يرجى التقدم إلى الشباك وانتظار دورك\n\n` +
        `تفاصيل المعاملة:\n` +
        `الزبون: ${customerInfo.customer_name}\n` +
        `الخدمة: إنشاء فيزا\n` +
        `الرسوم: 45 شيقل\n\n` +
        `✅ تم تسجيل المعاملة في النظام بنجاح` :
      
      language === 'he' ? 
        `🙏 תודה שבחרת בחנות שלנו\n\n` +
        `📋 אנא פנה לדלפק והמתן לתורך\n\n` +
        `פרטי העסקה:\n` +
        `לקוח: ${customerInfo.customer_name}\n` +
        `שירות: יצירת כרטיס\n` +
        `עמלה: 45 שקל\n\n` +
        `✅ העסקה נרשמה במערכת בהצלחה` :
      
        `🙏 Thank you for choosing our store\n\n` +
        `📋 Please proceed to the counter and wait for your turn\n\n` +
        `Transaction Details:\n` +
        `Customer: ${customerInfo.customer_name}\n` +
        `Service: Create Card\n` +
        `Fee: 45 Shekel\n\n` +
        `✅ Transaction recorded in system successfully`,
      
      [
        {
          text: language === 'ar' ? '🏠 العودة لأسعار اليوم' : 
                language === 'he' ? '🏠 חזרה למחירי היום' : 
                '🏠 Back to Today\'s Prices',
          onPress: () => router.replace('/(tabs)/prices')
        }
      ]
    );
  };

  const handleContinue = async () => {
    if (!validateCustomerInfo()) return;

    try {
      setLoading(true);
      console.log('🔄 معالجة بيانات الزبون...');

      // حفظ معرف الزبون الحالي في التخزين المحلي
      await AsyncStorage.setItem('currentCustomerId', customerInfo.national_id);
      await AsyncStorage.setItem('currentCustomerName', customerInfo.customer_name);
      await AsyncStorage.setItem('currentCustomerPhone', customerInfo.phone_number);
      await AsyncStorage.setItem('currentCustomerBirthDate', customerInfo.birth_date);
      
      if (image1) {
        await AsyncStorage.setItem('currentCustomerImage1', image1);
      }
      if (image2) {
        await AsyncStorage.setItem('currentCustomerImage2', image2);
      }
      
      console.log('✅ تم حفظ بيانات الزبون في التخزين المحلي');

      // معالجة المعاملة حسب نوع الخدمة
      if (fromCalculator && calculatorData) {
        // إنشاء أو تحديث بيانات الزبون في قاعدة البيانات
        try {
          const existingCustomer = await customerService.getByNationalId(customerInfo.national_id);
          
          if (existingCustomer) {
            // تحديث بيانات الزبون الموجود
            await customerService.update(existingCustomer.id, {
              customer_name: customerInfo.customer_name,
              phone_number: customerInfo.phone_number,
              birth_date: customerInfo.birth_date,
              image1_data: image1 || '',
              image1_type: image1 ? 'image/jpeg' : '',
              image2_data: image2 || '',
              image2_type: image2 ? 'image/jpeg' : ''
            });
            console.log('✅ تم تحديث بيانات الزبون في قاعدة البيانات');
          } else {
            // إنشاء زبون جديد
            await customerService.create({
              customer_name: customerInfo.customer_name,
              national_id: customerInfo.national_id,
              phone_number: customerInfo.phone_number,
              birth_date: customerInfo.birth_date,
              image1_data: image1 || '',
              image1_type: image1 ? 'image/jpeg' : '',
              image2_data: image2 || '',
              image2_type: image2 ? 'image/jpeg' : ''
            });
            console.log('✅ تم إنشاء زبون جديد في قاعدة البيانات');
          }
        } catch (customerError) {
          console.error('❌ خطأ في حفظ بيانات الزبون في قاعدة البيانات:', customerError);
          // المتابعة حتى لو فشل حفظ الزبون
        }

        // إنشاء معاملة صرافة الأموال في جدول transactions
        try {
          const transactionData = {
            service_number: 8, // صرافة أموال
            amount_paid: parseFloat(calculatorData.fromAmount),
            currency_paid: calculatorData.fromCurrency,
            amount_received: parseFloat(calculatorData.toAmount),
            currency_received: calculatorData.toCurrency,
            customer_id: customerInfo.national_id,
            notes: `معاملة صرافة أموال - الزبون: ${customerInfo.customer_name}`
          };
          
          console.log('🔄 إنشاء معاملة صرافة الأموال في جدول transactions:', transactionData);
          
          // إضافة المعاملة إلى قاعدة البيانات
          await transactionService.create(transactionData);
          
          console.log('✅ تم حفظ معاملة صرافة الأموال في جدول transactions بنجاح');
        } catch (transactionError) {
          console.error('❌ خطأ في حفظ المعاملة في قاعدة البيانات:', transactionError);
          // المتابعة حتى لو فشل حفظ المعاملة
        }

        // تنظيف البيانات المؤقتة
        await AsyncStorage.removeItem('fromCalculator');
        await AsyncStorage.removeItem('calculatorData');
        
        // عرض رسالة الشكر والتوجيه
        showCalculatorTransactionMessage();
      } else if (selectedService && selectedService.service_number === 1) {
        // معالجة خدمة إنشاء الفيزا - إتمام العملية مباشرة
        try {
          const existingCustomer = await customerService.getByNationalId(customerInfo.national_id);
          
          if (existingCustomer) {
            // تحديث بيانات الزبون الموجود
            await customerService.update(existingCustomer.id, {
              customer_name: customerInfo.customer_name,
              phone_number: customerInfo.phone_number,
              birth_date: customerInfo.birth_date,
              image1_data: image1 || '',
              image1_type: image1 ? 'image/jpeg' : '',
              image2_data: image2 || '',
              image2_type: image2 ? 'image/jpeg' : ''
            });
            console.log('✅ تم تحديث بيانات الزبون في قاعدة البيانات');
          } else {
            // إنشاء زبون جديد
            await customerService.create({
              customer_name: customerInfo.customer_name,
              national_id: customerInfo.national_id,
              phone_number: customerInfo.phone_number,
              birth_date: customerInfo.birth_date,
              image1_data: image1 || '',
              image1_type: image1 ? 'image/jpeg' : '',
              image2_data: image2 || '',
              image2_type: image2 ? 'image/jpeg' : ''
            });
            console.log('✅ تم إنشاء زبون جديد في قاعدة البيانات');
          }
        } catch (customerError) {
          console.error('❌ خطأ في حفظ بيانات الزبون في قاعدة البيانات:', customerError);
          Alert.alert(
            language === 'ar' ? 'تحذير' : language === 'he' ? 'אזהרה' : 'Warning',
            language === 'ar' ? 'حدث خطأ في حفظ بيانات الزبون، لكن سيتم المتابعة' : 
            language === 'he' ? 'אירעה שגיאה בשמירת נתוני הלקוח, אך נמשיך' : 
            'Error saving customer data, but will continue'
          );
        }

        // إنشاء معاملة إنشاء الفيزا في جدول transactions
        try {
          const transactionData = {
            service_number: 1, // إنشاء فيزا
            amount_paid: 45, // رسوم إنشاء الفيزا
            currency_paid: 'ILS',
            amount_received: 0,
            currency_received: 'ILS',
            customer_id: customerInfo.national_id,
            notes: `طلب إنشاء فيزا - الزبون: ${customerInfo.customer_name}`
          };
          
          console.log('🔄 إنشاء معاملة إنشاء الفيزا في جدول transactions:', transactionData);
          
          // إضافة المعاملة إلى قاعدة البيانات
          await transactionService.create(transactionData);
          
          console.log('✅ تم حفظ معاملة إنشاء الفيزا في جدول transactions بنجاح');
        } catch (transactionError) {
          console.error('❌ خطأ في حفظ المعاملة في قاعدة البيانات:', transactionError);
          Alert.alert(
            language === 'ar' ? 'خطأ' : language === 'he' ? 'שגיאה' : 'Error',
            language === 'ar' ? 'حدث خطأ في تسجيل المعاملة' : 
            language === 'he' ? 'אירעה שגיאה ברישום העסקה' : 
            'Error occurred recording transaction'
          );
          return;
        }

        // تنظيف البيانات المؤقتة
        await AsyncStorage.removeItem('currentCustomerId');
        await AsyncStorage.removeItem('currentCustomerName');
        await AsyncStorage.removeItem('currentCustomerPhone');
        await AsyncStorage.removeItem('currentCustomerBirthDate');
        await AsyncStorage.removeItem('currentCustomerImage1');
        await AsyncStorage.removeItem('currentCustomerImage2');
        await AsyncStorage.removeItem('selectedServiceNumber');
        await AsyncStorage.removeItem('selectedServiceName');
        await AsyncStorage.removeItem('selectedServiceNameHe');
        await AsyncStorage.removeItem('selectedServiceNameEn');
        
        // عرض رسالة الشكر والتوجيه
        showVisaCreationMessage();
      } else {
        await navigateToServiceScreen();
      }

    } catch (error) {
      console.error('❌ خطأ في معالجة بيانات الزبون:', error);
      Alert.alert(
        language === 'ar' ? 'خطأ' : language === 'he' ? 'שגיאה' : 'Error',
        language === 'ar' ? 'حدث خطأ في معالجة البيانات' : 
        language === 'he' ? 'אירעה שגיאה בעיבוד הנתונים' : 
        'Error occurred while processing data'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const getTextAlign = () => {
    return language === 'en' ? 'left' : 'right';
  };

  const getNationalIdInputStyle = () => {
    if (searching) {
      return [styles.input, styles.searchingInput, { textAlign: 'center' }];
    } else if (customerFound) {
      return [styles.input, styles.foundInput, { textAlign: 'center' }];
    } else {
      return [styles.input, { textAlign: 'center' }];
    }
  };

  const getNationalIdPlaceholder = () => {
    if (searching) {
      return language === 'ar' ? 'جاري البحث...' : 
             language === 'he' ? 'מחפש...' : 
             'Searching...';
    } else if (customerFound) {
      return language === 'ar' ? '✅ تم العثور على الزبون' : 
             language === 'he' ? '✅ הלקוח נמצא' : 
             '✅ Customer Found';
    } else {
      return '123456789';
    }
  };

  const requiredFields = getRequiredFields();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>
              {language === 'ar' && '← العودة'}
              {language === 'he' && '← חזרה'}
              {language === 'en' && '← Back'}
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.title}>
            {language === 'ar' && 'معلومات الزبون'}
            {language === 'he' && 'פרטי הלקוח'}
            {language === 'en' && 'Customer Information'}
          </Text>
          
          <View style={{ width: 80 }} />
        </View>

        <View style={styles.content}>
          {/* Selected Service Display */}
          <View style={styles.selectedServiceContainer}>
            <Text style={[styles.selectedServiceLabel, { textAlign: getTextAlign() }]}>
              {language === 'ar' && 'الخدمة المختارة:'}
              {language === 'he' && 'השירות הנבחר:'}
              {language === 'en' && 'Selected Service:'}
            </Text>
            <Text style={[styles.selectedServiceName, { textAlign: getTextAlign() }]}>
              {getDisplayedServiceName()}
            </Text>
          </View>

          {/* Customer Information Form */}
          <View style={styles.formContainer}>
            <Text style={[styles.sectionTitle, { textAlign: getTextAlign() }]}>
              {language === 'ar' && 'البيانات الأساسية:'}
              {language === 'he' && 'פרטים בסיסיים:'}
              {language === 'en' && 'Basic Information:'}
            </Text>

            {/* National ID with Auto Search */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { textAlign: getTextAlign() }]}>
                {language === 'ar' && 'رقم الهوية (9 أرقام):'}
                {language === 'he' && 'מספר זהות (9 ספרות):'}
                {language === 'en' && 'National ID (9 digits):'}
              </Text>
              <TextInput
                style={getNationalIdInputStyle()}
                value={customerInfo.national_id}
                onChangeText={handleNationalIdChange}
                placeholder={getNationalIdPlaceholder()}
                keyboardType="numeric"
                maxLength={9}
                editable={!searching}
              />
              {searching && (
                <Text style={[styles.searchingText, { textAlign: getTextAlign() }]}>
                  {language === 'ar' && 'جاري البحث في قاعدة البيانات...'}
                  {language === 'he' && 'מחפש במסד הנתונים...'}
                  {language === 'en' && 'Searching in database...'}
                </Text>
              )}
              {customerFound && (
                <Text style={[styles.foundText, { textAlign: getTextAlign() }]}>
                  {language === 'ar' && '✅ تم العثور على الزبون وتحميل بياناته'}
                  {language === 'he' && '✅ הלקוח נמצא והנתונים נטענו'}
                  {language === 'en' && '✅ Customer found and data loaded'}
                </Text>
              )}
            </View>

            {/* Customer Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { textAlign: getTextAlign() }]}>
                {language === 'ar' && 'اسم الزبون:'}
                {language === 'he' && 'שם הלקוח:'}
                {language === 'en' && 'Customer Name:'}
              </Text>
              <TextInput
                style={[
                  styles.input, 
                  customerFound && styles.foundInput,
                  { textAlign: getTextAlign() }
                ]}
                value={customerInfo.customer_name}
                onChangeText={(text) => setCustomerInfo(prev => ({ ...prev, customer_name: text }))}
                placeholder={
                  language === 'ar' ? 'أحمد محمد' :
                  language === 'he' ? 'אחמד מוחמד' :
                  'Ahmad Mohammad'
                }
                editable={!customerFound}
              />
            </View>

            {/* Birth Date */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { textAlign: getTextAlign() }]}>
                {language === 'ar' && 'تاريخ الميلاد:'}
                {language === 'he' && 'תאריך לידה:'}
                {language === 'en' && 'Birth Date:'}
              </Text>
              <TextInput
                style={[
                  styles.input, 
                  customerFound && styles.foundInput,
                  { textAlign: 'center' }
                ]}
                value={customerInfo.birth_date}
                onChangeText={(text) => setCustomerInfo(prev => ({ ...prev, birth_date: text }))}
                placeholder="1990-01-01"
                editable={!customerFound}
              />
            </View>

            {/* Phone Number (if required) */}
            {requiredFields.phone && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { textAlign: getTextAlign() }]}>
                  {language === 'ar' && 'رقم الهاتف:'}
                  {language === 'he' && 'מספר טלפון:'}
                  {language === 'en' && 'Phone Number:'}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    customerFound && customerInfo.phone_number ? styles.foundInput : styles.input,
                    { textAlign: 'center' }
                  ]}
                  value={customerInfo.phone_number}
                  onChangeText={(text) => setCustomerInfo(prev => ({ ...prev, phone_number: text }))}
                  placeholder="0501234567"
                  keyboardType="phone-pad"
                  editable={true}
                />
              </View>
            )}

            {/* Image 1 (if required) */}
            {requiredFields.images && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { textAlign: getTextAlign() }]}>
                  {getImage1Label()}:
                </Text>
                
                {image1 ? (
                  <View style={styles.imageContainer}>
                    <Image source={{ uri: image1 }} style={styles.uploadedImage} />
                    {!customerFound && (
                      <View style={styles.imageActions}>
                        <TouchableOpacity 
                          style={styles.changeImageButton}
                          onPress={() => pickImage(1)}
                        >
                          <Text style={styles.changeImageButtonText}>
                            {language === 'ar' && 'تغيير'}
                            {language === 'he' && 'שנה'}
                            {language === 'en' && 'Change'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.removeImageButton}
                          onPress={() => removeImage(1)}
                        >
                          <Text style={styles.removeImageButtonText}>
                            {language === 'ar' && 'حذف'}
                            {language === 'he' && 'מחק'}
                            {language === 'en' && 'Remove'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    {customerFound && (
                      <Text style={[styles.imageLoadedText, { textAlign: getTextAlign() }]}>
                        {language === 'ar' && '✅ تم تحميل الصورة من قاعدة البيانات'}
                        {language === 'he' && '✅ התמונה נטענה ממסד הנתונים'}
                        {language === 'en' && '✅ Image loaded from database'}
                      </Text>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.uploadButton}
                    onPress={() => pickImage(1)}
                  >
                    <Text style={styles.uploadButtonIcon}>📷</Text>
                    <Text style={[styles.uploadButtonText, { textAlign: getTextAlign() }]}>
                      {language === 'ar' && `اختيار ${getImage1Label()}`}
                      {language === 'he' && `בחר ${getImage1Label()}`}
                      {language === 'en' && `Select ${getImage1Label()}`}
                    </Text>
                  </TouchableOpacity>
                )}
                
                {/* رسالة للبيانات المفقودة */}
                {customerFound && !image1 && (
                  <Text style={[styles.missingDataText, { textAlign: getTextAlign() }]}>
                    {language === 'ar' && '⚠️ الصورة غير موجودة - يمكنك إضافتها'}
                    {language === 'he' && '⚠️ התמונה חסרה - ניתן להוסיף'}
                    {language === 'en' && '⚠️ Image missing - you can add it'}
                  </Text>
                )}
              </View>
            )}

            {/* Image 2 (if required) */}
            {requiredFields.images && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { textAlign: getTextAlign() }]}>
                  {getImage2Label()}:
                </Text>
                
                {image2 ? (
                  <View style={styles.imageContainer}>
                    <Image source={{ uri: image2 }} style={styles.uploadedImage} />
                    {!customerFound && (
                      <View style={styles.imageActions}>
                        <TouchableOpacity 
                          style={styles.changeImageButton}
                          onPress={() => pickImage(2)}
                        >
                          <Text style={styles.changeImageButtonText}>
                            {language === 'ar' && 'تغيير'}
                            {language === 'he' && 'שנה'}
                            {language === 'en' && 'Change'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.removeImageButton}
                          onPress={() => removeImage(2)}
                        >
                          <Text style={styles.removeImageButtonText}>
                            {language === 'ar' && 'حذف'}
                            {language === 'he' && 'מחק'}
                            {language === 'en' && 'Remove'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    {customerFound && (
                      <Text style={[styles.imageLoadedText, { textAlign: getTextAlign() }]}>
                        {language === 'ar' && '✅ تم تحميل الصورة من قاعدة البيانات'}
                        {language === 'he' && '✅ התמונה נטענה ממסד הנתונים'}
                        {language === 'en' && '✅ Image loaded from database'}
                      </Text>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.uploadButton}
                    onPress={() => pickImage(2)}
                  >
                    <Text style={styles.uploadButtonIcon}>📄</Text>
                    <Text style={[styles.uploadButtonText, { textAlign: getTextAlign() }]}>
                      {language === 'ar' && `اختيار ${getImage2Label()}`}
                      {language === 'he' && `בחר ${getImage2Label()}`}
                      {language === 'en' && `Select ${getImage2Label()}`}
                    </Text>
                  </TouchableOpacity>
                )}
                
                {/* رسالة للبيانات المفقودة */}
                {customerFound && !image2 && (
                  <Text style={[styles.missingDataText, { textAlign: getTextAlign() }]}>
                    {language === 'ar' && '⚠️ الصورة غير موجودة - يمكنك إضافتها'}
                    {language === 'he' && '⚠️ התמונה חסרה - ניתן להוסיף'}
                    {language === 'en' && '⚠️ Image missing - you can add it'}
                  </Text>
                )}
              </View>
            )}

            {/* Continue Button */}
            <TouchableOpacity 
              style={[styles.continueButton, loading && styles.disabledButton]} 
              onPress={handleContinue}
              disabled={loading}
            >
              <Text style={styles.continueButtonText}>
                {loading ? (
                  language === 'ar' ? 'جاري المعالجة...' :
                  language === 'he' ? 'מעבד...' :
                  'Processing...'
                ) : (
                  language === 'ar' ? '✅ متابعة' :
                  language === 'he' ? '✅ המשך' :
                  '✅ Continue'
                )}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Information Section */}
          <View style={styles.infoContainer}>
            <Text style={[styles.infoTitle, { textAlign: getTextAlign() }]}>
              {language === 'ar' && 'ℹ️ معلومات مطلوبة:'}
              {language === 'he' && 'ℹ️ מידע נדרש:'}
              {language === 'en' && 'ℹ️ Required Information:'}
            </Text>
            <Text style={[styles.infoText, { textAlign: getTextAlign() }]}>
              {language === 'ar' && '• رقم الهوية (9 أرقام) - البحث التلقائي'}
              {language === 'he' && '• מספר זהות (9 ספרות) - חיפוש אוטומטי'}
              {language === 'en' && '• National ID (9 digits) - Auto search'}
            </Text>
            <Text style={[styles.infoText, { textAlign: getTextAlign() }]}>
              {language === 'ar' && '• اسم الزبون الكامل'}
              {language === 'he' && '• שם הלקוח המלא'}
              {language === 'en' && '• Full customer name'}
            </Text>
            <Text style={[styles.infoText, { textAlign: getTextAlign() }]}>
              {language === 'ar' && '• تاريخ الميلاد'}
              {language === 'he' && '• תאריך לידה'}
              {language === 'en' && '• Birth date'}
            </Text>
            {requiredFields.phone && (
              <Text style={[styles.infoText, { textAlign: getTextAlign() }]}>
                {language === 'ar' && '• رقم الهاتف'}
                {language === 'he' && '• מספר טלפון'}
                {language === 'en' && '• Phone number'}
              </Text>
            )}
            {requiredFields.images && (
              <>
                <Text style={[styles.infoText, { textAlign: getTextAlign() }]}>
                  {language === 'ar' && `• ${getImage1Label()}`}
                  {language === 'he' && `• ${getImage1Label()}`}
                  {language === 'en' && `• ${getImage1Label()}`}
                </Text>
                <Text style={[styles.infoText, { textAlign: getTextAlign() }]}>
                  {language === 'ar' && `• ${getImage2Label()}`}
                  {language === 'he' && `• ${getImage2Label()}`}
                  {language === 'en' && `• ${getImage2Label()}`}
                </Text>
              </>
            )}
          </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  backButton: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    width: 80,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0369A1',
    textAlign: 'center',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  selectedServiceContainer: {
    backgroundColor: '#EFF6FF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  selectedServiceLabel: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '600',
    marginBottom: 5,
  },
  selectedServiceName: {
    fontSize: 18,
    color: '#1E40AF',
    fontWeight: 'bold',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 25,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    padding: 15,
    fontSize: 16,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    color: '#1F2937',
  },
  searchingInput: {
    borderColor: '#F59E0B',
    backgroundColor: '#FEF3C7',
  },
  foundInput: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  searchingText: {
    fontSize: 12,
    color: '#92400E',
    marginTop: 5,
    fontStyle: 'italic',
  },
  foundText: {
    fontSize: 12,
    color: '#065F46',
    marginTop: 5,
    fontWeight: '600',
  },
  imageLoadedText: {
    fontSize: 12,
    color: '#065F46',
    marginTop: 8,
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: '#0369A1',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#0369A1',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoContainer: {
    backgroundColor: '#FEF3C7',
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#92400E',
    marginBottom: 8,
    lineHeight: 20,
  },
  // Image Upload Styles
  uploadButton: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  uploadButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  imageContainer: {
    alignItems: 'center',
  },
  uploadedImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
  },
  imageActions: {
    flexDirection: 'row',
    gap: 10,
  },
  changeImageButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  changeImageButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  removeImageButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  removeImageButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  missingDataText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 8,
    fontStyle: 'italic',
  },
});