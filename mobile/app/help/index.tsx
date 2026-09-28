import { Button } from "@/components/ui/Button";
import { ScreenWrapper } from "@/components/ui/ScreenWrapper";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useT as useTranslation } from '@/lib/useT';

export default function HelpSupportScreen() {
    const { t } = useTranslation();
    const router = useRouter();

    const ContactMethod = ({ icon, title, subtitle, onPress, color }: any) => (
        <TouchableOpacity
            onPress={onPress}
            className="flex-row items-center bg-white p-4 rounded-2xl border border-gray-100 mb-3 shadow-sm"
        >
            <View style={{ backgroundColor: color + '15' }} className="w-10 h-10 rounded-full items-center justify-center mr-4">
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <View className="flex-1">
                <Text className="text-gray-900 font-bold text-base">{title}</Text>
                <Text className="text-gray-500 text-sm mt-0.5">{subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
        </TouchableOpacity>
    );

    const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
        const [isOpen, setIsOpen] = useState(false);
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setIsOpen(!isOpen)}
                className="bg-white p-4 rounded-xl border border-gray-100 mb-3"
            >
                <View className="flex-row justify-between items-center">
                    <Text className="text-gray-900 font-semibold text-base flex-1 mr-4">{question}</Text>
                    <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={20} color="#64748B" />
                </View>
                {isOpen && (
                    <Text className="text-gray-600 text-sm mt-3 leading-5">
                        {answer}
                    </Text>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <ScreenWrapper bg="bg-gray-50">
            <View className="bg-white border-b border-gray-100 px-6 pt-12 pb-4 flex-row items-center">
                <TouchableOpacity
                    onPress={() => router.back()}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Go back"
                    accessibilityRole="button"
                    className="mr-4 p-2 -ml-2 rounded-full active:bg-gray-50"
                >
                    <Ionicons name="arrow-back" size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900">{t('help_support')}</Text>
            </View>

            <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>

                {/* Contact Section */}
                <Text className="text-gray-900 font-bold text-lg mb-4">{t('contact_us')}</Text>
                <ContactMethod
                    icon="mail-outline"
                    title={t('email_support')}
                    subtitle="globalinkmarketplace@gmail.com"
                    onPress={() => Linking.openURL('mailto:globalinkmarketplace@gmail.com')}
                    color="#6366F1"
                />
                <ContactMethod
                    icon="logo-whatsapp"
                    title={t('whatsapp')}
                    subtitle={t('whatsapp_desc')}
                    onPress={() => Linking.openURL('https://wa.me/2348101293037')}
                    color="#22C55E"
                />
                <ContactMethod
                    icon="call-outline"
                    title={t('call_us')}
                    subtitle="+234 810 129 3037"
                    onPress={() => Linking.openURL('tel:+2348101293037')}
                    color="#3B82F6"
                />

                {/* FAQ Section */}
                <Text className="text-gray-900 font-bold text-lg mb-4 mt-8">{t('faq')}</Text>
                <FAQItem
                    question={t('faq_track_order')}
                    answer={t('faq_track_order_ans')}
                />
                <FAQItem
                    question={t('faq_reset_password')}
                    answer={t('faq_reset_password_ans')}
                />
                <FAQItem
                    question={t('faq_change_address')}
                    answer={t('faq_change_address_ans')}
                />
                <FAQItem
                    question={t('faq_payment_methods')}
                    answer={t('faq_payment_methods_ans')}
                />

                {/* Report Issue Button */}
                <View className="mt-8">
                    <Button
                        title={t('report_issue')}
                        onPress={() => Linking.openURL('mailto:globalinkmarketplace@gmail.com?subject=App%20Issue%20Report')}
                        variant="secondary"
                        icon={<Ionicons name="bug-outline" size={20} color="#1F2937" />}
                    />
                </View>

            </ScrollView>
        </ScreenWrapper>
    );
}
