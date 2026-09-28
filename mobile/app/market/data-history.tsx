import { fetchDataHistory } from '@/src/services/financeService';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Clock, Database, Download, RefreshCw } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface DataPurchase {
  id: string;
  amount: string;
  status: string;
  description: string;
  reference: string;
  created_at: string;
}

function parseDescription(desc: string) {
  const match = desc.match(/^Nellobyte Data:\s*(\S+)\s*\(([^)]*)\)\s*to\s*(\S+)/i);
  if (match) return { network: match[1], plan: match[2], phone: match[3] };
  return { network: 'N/A', plan: 'N/A', phone: 'N/A' };
}

const statusStyles: Record<string, { label: string; bg: string; text: string }> = {
  success: { label: 'Success', bg: 'bg-green-100', text: 'text-green-700' },
  pending: { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-700' },
  failed: { label: 'Failed', bg: 'bg-red-100', text: 'text-red-700' },
};

const receiptHTML = (item: {
  orderId: string; network: string; plan: string;
  amount: string; phone: string; date: string; time: string;
}) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>GLAPP DATA Receipt</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%);display:flex;justify-content:center;padding:40px 20px;min-height:100vh}
.receipt{max-width:380px;width:100%;background:white;border-radius:28px;overflow:hidden;box-shadow:0 20px 60px rgba(50,150,41,0.15),0 8px 20px rgba(0,0,0,0.06);position:relative}
.header{background:linear-gradient(135deg,#14532D 0%,#329629 40%,#4ADE80 100%);padding:36px 24px 32px;text-align:center;position:relative;overflow:hidden}
.header .deco{position:absolute;border-radius:50%;background:rgba(255,255,255,0.06)}
.header .d1{width:120px;height:120px;top:-40px;right:-30px}
.header .d2{width:80px;height:80px;bottom:-20px;left:-20px}
.brand{color:rgba(255,255,255,0.9);font-size:10px;font-weight:800;letter-spacing:4px;text-transform:uppercase;margin-bottom:2px}
.title{color:white;font-size:22px;font-weight:900;letter-spacing:-0.5px}
.amount-box{background:white;border-radius:20px;padding:24px 20px;text-align:center;margin:-20px 20px 20px;box-shadow:0 8px 24px rgba(50,150,41,0.12);border:1px solid rgba(74,222,128,0.2);position:relative;z-index:2}
.amount-label{color:#94a3b8;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-bottom:2px}
.amount-value{color:#329629;font-size:40px;font-weight:900;line-height:1.1}
.details{padding:4px 24px 20px}
.row{display:flex;justify-content:space-between;align-items:center;padding:14px 0}
.row+.row{border-top:1px dashed #e2e8f0}
.label{color:#94a3b8;font-size:12px;font-weight:600}
.value{color:#0f172a;font-size:13px;font-weight:800}
.value.green{color:#16a34a}
.stamp{text-align:center;padding:16px 24px 24px}
.stamp-inner{display:inline-flex;align-items:center;gap:8px;background:#f0fdf4;border:2px solid #4ADE80;border-radius:12px;padding:8px 20px}
.stamp-inner span{color:#16a34a;font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase}
.footer{text-align:center;padding:0 24px 20px}
.footer-text{color:#cbd5e1;font-size:10px;font-weight:500}
</style></head><body>
<div class="receipt">
<div class="header"><div class="deco d1"></div><div class="deco d2"></div>
<div class="brand">GLAPP DATA</div>
<div class="title">Payment Receipt</div>
</div>
<div class="amount-box"><div class="amount-label">Total Amount</div><div class="amount-value">₦${Number(item.amount).toLocaleString()}</div></div>
<div class="details">
<div class="row"><span class="label">Reference</span><span class="value">${item.orderId}</span></div>
<div class="row"><span class="label">Network</span><span class="value">${item.network}</span></div>
<div class="row"><span class="label">Plan</span><span class="value">${item.plan}</span></div>
<div class="row"><span class="label">Mobile Number</span><span class="value">${item.phone}</span></div>
<div class="row"><span class="label">Date</span><span class="value">${item.date}</span></div>
<div class="row"><span class="label">Time</span><span class="value">${item.time}</span></div>
<div class="row"><span class="label">Status</span><span class="value green">Successful ✓</span></div>
</div>
<div class="stamp"><div class="stamp-inner"><span>Paid & Verified</span></div></div>
<div class="footer"><div class="footer-text">GLAPP DATA • Nellobyte Systems</div></div>
</div></body></html>`;

export default function DataHistoryScreen() {
  const router = useRouter();
  const [data, setData] = useState<DataPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetch = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res: any = await fetchDataHistory();
      setData(res.results || res);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  React.useEffect(() => { fetch(); }, [fetch]);

  const handleDownloadPDF = async (item: DataPurchase) => {
    const { network, plan, phone } = parseDescription(item.description);
    const date = new Date(item.created_at);
    const formattedDate = date.toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
    const formattedTime = date.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });

    setDownloadingId(item.id);
    try {
      const { uri } = await Print.printToFileAsync({
        html: receiptHTML({
          orderId: item.reference || item.id,
          network, plan, phone,
          amount: String(Math.abs(Number(item.amount))),
          date: formattedDate, time: formattedTime,
        }),
        base64: false,
      });
      const pdfName = `GLAPP_DATA_${item.reference || item.id}.pdf`;
      const dest = `${(FileSystem as any).documentDirectory || ''}${pdfName}`;
      await FileSystem.moveAsync({ from: uri, to: dest });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dest, { mimeType: 'application/pdf', dialogTitle: 'Save GLAPP DATA Receipt' });
      } else {
        Alert.alert('PDF Saved', `Saved to: ${dest}`);
      }
    } catch { Alert.alert('Error', 'Failed to generate PDF'); }
    finally { setDownloadingId(null); }
  };

  const renderItem = ({ item }: { item: DataPurchase }) => {
    const { network, plan, phone } = parseDescription(item.description);
    const st = statusStyles[item.status] || statusStyles.pending;
    const date = new Date(item.created_at);
    const formattedDate = date.toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
    const formattedTime = date.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });

    return (
      <TouchableOpacity
        onPress={() => router.push({
          pathname: '/market/receipt',
          params: {
            orderId: item.reference || item.id, network, planName: plan,
            amount: String(Math.abs(Number(item.amount))), phone,
            date: formattedDate, status: item.status,
          },
        })}
        className="bg-white rounded-2xl p-4 mx-6 mb-3"
        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}
      >
        <View className="flex-row justify-between items-start">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center mb-1">
              <View className="bg-green-50 rounded-full px-2 py-0.5">
                <Text className="text-green-700 text-[10px] font-bold uppercase tracking-wider">{network}</Text>
              </View>
            </View>
            <Text className="text-gray-500 text-sm ml-0.5 mt-1.5 font-medium" numberOfLines={1}>{plan}</Text>
            <Text className="text-gray-400 text-xs ml-0.5 mt-1">{phone}</Text>
          </View>
          <View className="items-end">
            <Text className="text-gray-900 font-black text-lg">₦{Math.abs(Number(item.amount)).toLocaleString()}</Text>
            <View className={`mt-1.5 px-2.5 py-0.5 rounded-full ${st.bg}`}>
              <Text className={`text-[9px] font-bold uppercase ${st.text}`}>{st.label}</Text>
            </View>
          </View>
        </View>
        <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-50">
          <View className="flex-row items-center">
            <Clock size={12} color="#9CA3AF" />
            <Text className="text-gray-400 text-xs ml-1">{formattedDate} • {formattedTime}</Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDownloadPDF(item)}
            disabled={downloadingId === item.id}
          >
            {downloadingId === item.id ? (
              <ActivityIndicator size="small" color="#329629" />
            ) : (
              <View className="bg-green-50 p-2 rounded-xl">
                <Download size={16} color="#329629" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-6 py-4 border-b border-gray-100 bg-white flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Text className="text-2xl">←</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 flex-1">Data History</Text>
        <TouchableOpacity onPress={() => fetch(true)}>
          <RefreshCw size={20} color="#329629" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#329629" />
          <Text className="text-gray-400 mt-3 text-sm">Loading history...</Text>
        </View>
      ) : data.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Database size={48} color="#D1D5DB" />
          <Text className="text-gray-400 text-lg font-bold mt-4">No Data Purchases Yet</Text>
          <Text className="text-gray-300 text-sm mt-1 text-center">Your receipt history will appear here</Text>
          <TouchableOpacity
            onPress={() => router.push('/finance/buy-data')}
            className="bg-primary px-8 py-3.5 rounded-2xl mt-6"
            style={{ shadowColor: '#329629', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 }}
          >
            <Text className="text-white font-bold">Buy Data Now</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerClassName="py-4"
          initialNumToRender={12}
          windowSize={7}
          removeClippedSubviews
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetch(true)} colors={['#329629']} />}
        />
      )}
    </SafeAreaView>
  );
}
