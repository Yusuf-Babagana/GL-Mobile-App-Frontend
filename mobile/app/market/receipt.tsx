import { useLocalSearchParams, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { CheckCircle, Download, Share2, Sparkles } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Alert, Animated, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import ViewShot, { ViewShotRef } from 'react-native-view-shot';
import { SafeAreaView } from 'react-native-safe-area-context';

const receiptHTML = (p: {
  orderId: string; network: string; planName: string; amount: string;
  phone: string; date: string; time: string; token?: string;
}) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GLAPP DATA Receipt</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Helvetica,Arial,sans-serif;background:#f0fdf4;display:flex;justify-content:center;padding:40px 20px}
.receipt{max-width:380px;width:100%;background:white;border-radius:28px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.12)}
.header{background:#329629;padding:36px 24px 32px;text-align:center}
.brand{color:rgba(255,255,255,0.85);font-size:10px;font-weight:800;letter-spacing:4px;text-transform:uppercase;margin-bottom:4px}
.title{color:white;font-size:22px;font-weight:900}
.amount-box{background:white;border-radius:20px;padding:24px;text-align:center;margin:-20px 24px 20px;border:1px solid #dcfce7;position:relative;z-index:2}
.amount-label{color:#94a3b8;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-bottom:4px}
.amount-value{color:#329629;font-size:40px;font-weight:900}
.details{padding:4px 24px 20px}
.row{display:flex;justify-content:space-between;align-items:center;padding:14px 0}
.row+.row{border-top:1px dashed #e2e8f0}
.label{color:#94a3b8;font-size:12px;font-weight:600}
.value{color:#0f172a;font-size:13px;font-weight:800}
.value.green{color:#16a34a}
.stamp{text-align:center;padding:8px 24px 24px}
.stamp-box{display:inline-block;background:#f0fdf4;border:2px solid #4ADE80;border-radius:12px;padding:8px 20px}
.stamp-box span{color:#16a34a;font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase}
.footer{text-align:center;padding:0 24px 20px}
.footer-text{color:#cbd5e1;font-size:10px;font-weight:500}
</style>
</head>
<body>
<div class="receipt">
<div class="header">
<div class="brand">GLAPP DATA</div>
<div class="title">Payment Receipt</div>
</div>
<div class="amount-box">
<div class="amount-label">Total Amount</div>
<div class="amount-value">&#8358;${Number(p.amount || 0).toLocaleString()}</div>
</div>
<div class="details">
<div class="row"><span class="label">Reference</span><span class="value">${p.orderId}</span></div>
<div class="row"><span class="label">Network</span><span class="value">${p.network}</span></div>
<div class="row"><span class="label">Plan</span><span class="value">${p.planName}</span></div>
<div class="row"><span class="label">Mobile Number</span><span class="value">${p.phone}</span></div>
${p.token ? `<div class="row"><span class="label">Token</span><span class="value">${p.token}</span></div>` : ''}
<div class="row"><span class="label">Date</span><span class="value">${p.date}</span></div>
<div class="row"><span class="label">Time</span><span class="value">${p.time}</span></div>
<div class="row"><span class="label">Status</span><span class="value green">Successful</span></div>
</div>
<div class="stamp"><div class="stamp-box"><span>Paid &amp; Verified</span></div></div>
<div class="footer"><div class="footer-text">GLAPP DATA</div></div>
</div>
</body>
</html>`;

export default function ReceiptScreen() {
  const router = useRouter();
  const ref = useRef<ViewShotRef>(null);
  const [loading, setLoading] = React.useState<'idle' | 'png' | 'pdf'>('idle');
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const params = useLocalSearchParams<{
    orderId: string; network: string; planName: string;
    amount: string; phone: string; date: string; status: string; token?: string;
  }>();

  const displayDate = params.date || new Date().toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
  const displayTime = new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });

  const handleSharePNG = async () => {
    if (!ref.current) return;
    setLoading('png');
    try {
      const uri = await (ref.current as any)?.capture?.();
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share GLAPP DATA Receipt' });
      } else {
        Alert.alert('Receipt', `Saved to: ${uri}`);
      }
    } catch { /* cancelled */ }
    finally { setLoading('idle'); }
  };

  const handleDownloadPDF = async () => {
    setLoading('pdf');
    try {
      const html = receiptHTML({
        orderId: params.orderId || 'N/A', network: params.network || 'N/A',
        planName: params.planName || 'N/A', amount: params.amount || '0',
        phone: params.phone || 'N/A', date: displayDate, time: displayTime, token: params.token,
      });
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const pdfName = `GLAPP_DATA_${params.orderId || 'receipt'}.pdf`;
      const dest = `${(FileSystem as any).documentDirectory || ''}${pdfName}`;
      await FileSystem.moveAsync({ from: uri, to: dest });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dest, { mimeType: 'application/pdf', dialogTitle: 'Save GLAPP DATA Receipt PDF' });
      } else {
        Alert.alert('PDF Saved', `Saved to: ${dest}`);
      }
    } catch (e: any) {
      // PDF failed — fallback: share as PNG instead
      if (ref.current) {
        try {
          const uri = await (ref.current as any)?.capture?.();
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share GLAPP DATA Receipt' });
            return;
          }
        } catch {}
      }
      Alert.alert('Notice', 'PDF unavailable — shared as picture instead.');
    } finally { setLoading('idle'); }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: '#f0fdf4' }}>
      <ScrollView className="flex-1" contentContainerClassName="p-5 items-center" showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: opacityAnim, transform: [{ scale: scaleAnim }] }} className="w-full max-w-sm">
          <ViewShot ref={ref} options={{ format: 'png', quality: 1 }} style={{ width: '100%' }}>
            <View className="bg-white rounded-3xl overflow-hidden" style={{ shadowColor: '#329629', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 10 }}>
              {/* Header */}
              <View className="relative overflow-hidden" style={{ backgroundColor: '#329629' }}>
                <View className="absolute -top-10 -right-8 w-28 h-28 rounded-full bg-white/5" />
                <View className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-white/5" />
                <View className="px-6 pt-8 pb-10 items-center">
                  <Text className="text-white/80 text-[10px] font-black tracking-[4px] uppercase mb-1">GLAPP DATA</Text>
                  <Text className="text-white text-2xl font-black tracking-tight">Payment Receipt</Text>
                  <View className="flex-row items-center bg-white/15 rounded-full px-4 py-1.5 mt-3">
                    <CheckCircle size={14} color="white" />
                    <Text className="text-white text-[11px] font-bold ml-1.5">Verified Transaction</Text>
                  </View>
                </View>
              </View>

              {/* Amount */}
              <View className="items-center -mt-5 mb-5 z-10">
                <View className="bg-white rounded-2xl px-10 py-5" style={{ shadowColor: '#329629', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 5, borderWidth: 1, borderColor: 'rgba(74,222,128,0.15)' }}>
                  <Text className="text-gray-400 text-[9px] font-bold uppercase tracking-[2px] text-center">Total Amount</Text>
                  <Text className="text-4xl font-black text-center" style={{ color: '#329629' }}>₦{Number(params.amount || 0).toLocaleString()}</Text>
                </View>
              </View>

              {/* Details */}
              <View className="px-6 pb-4">
                <DetailRow label="Reference" value={params.orderId || 'N/A'} />
                <View style={{ borderStyle: 'dashed', borderTopWidth: 1, borderColor: '#e2e8f0' }} />
                <DetailRow label="Network" value={params.network || 'N/A'} />
                <View style={{ borderStyle: 'dashed', borderTopWidth: 1, borderColor: '#e2e8f0' }} />
                <DetailRow label="Plan" value={params.planName || 'N/A'} />
                <View style={{ borderStyle: 'dashed', borderTopWidth: 1, borderColor: '#e2e8f0' }} />
                <DetailRow label="Mobile Number" value={params.phone || 'N/A'} />
                <View style={{ borderStyle: 'dashed', borderTopWidth: 1, borderColor: '#e2e8f0' }} />
                {!!params.token && (
                  <>
                    <DetailRow label="Token" value={params.token} />
                    <View style={{ borderStyle: 'dashed', borderTopWidth: 1, borderColor: '#e2e8f0' }} />
                  </>
                )}
                <DetailRow label="Date" value={displayDate} />
                <View style={{ borderStyle: 'dashed', borderTopWidth: 1, borderColor: '#e2e8f0' }} />
                <DetailRow label="Time" value={displayTime} />
                <View style={{ borderStyle: 'dashed', borderTopWidth: 1, borderColor: '#e2e8f0' }} />
                <DetailRow label="Status" value="Successful ✓" valueColor="text-green-600" />
              </View>

              {/* Stamp */}
              <View className="flex-row items-center px-6 pb-2">
                <View className="flex-1" style={{ borderStyle: 'dashed', borderTopWidth: 1, borderColor: '#e2e8f0' }} />
                <View className="w-1.5 h-1.5 rounded-full bg-gray-200 mx-2" />
                <View className="flex-1" style={{ borderStyle: 'dashed', borderTopWidth: 1, borderColor: '#e2e8f0' }} />
              </View>
              <View className="items-center py-3 pb-5">
                <View className="flex-row items-center bg-green-50 border-2 border-green-200 rounded-xl px-5 py-2">
                  <Sparkles size={14} color="#16a34a" />
                  <Text className="text-green-700 text-[11px] font-black uppercase tracking-wider ml-2">Paid & Verified</Text>
                </View>
              </View>

              <View className="items-center pb-5">
                <Text className="text-gray-300 text-[10px] font-medium">GLAPP DATA</Text>
              </View>
            </View>
          </ViewShot>
        </Animated.View>

        {/* Buttons */}
        <View className="w-full max-w-sm mt-6 gap-3">
          <TouchableOpacity
            onPress={handleSharePNG}
            disabled={loading !== 'idle'}
            className="bg-primary py-4.5 rounded-2xl items-center flex-row justify-center"
            style={{ shadowColor: '#329629', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 }}
          >
            {loading === 'png' ? <ActivityIndicator color="white" size="small" /> : <><Share2 size={20} color="white" /><Text className="text-white font-bold text-base ml-3">Share as Picture</Text></>}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDownloadPDF}
            disabled={loading !== 'idle'}
            className="bg-white py-4.5 rounded-2xl items-center flex-row justify-center border-2 border-primary"
          >
            {loading === 'pdf' ? <ActivityIndicator color="#329629" size="small" /> : <><Download size={20} color="#329629" /><Text className="text-primary font-bold text-base ml-3">Download PDF</Text></>}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
            className="bg-gray-100 py-4 rounded-2xl items-center"
          >
            <Text className="text-gray-600 font-bold text-base">Done</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View className="flex-row justify-between items-center py-3.5">
      <Text className="text-gray-400 text-sm font-medium">{label}</Text>
      <Text className={`text-gray-900 text-sm font-bold ${valueColor || ''}`}>{value}</Text>
    </View>
  );
}
