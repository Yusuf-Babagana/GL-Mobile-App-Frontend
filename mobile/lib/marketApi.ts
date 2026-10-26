import api from './api'; // The axios instance from mobile/lib/api.ts

// Helper to standardise error handling
const handleApiError = (error: any) => {
    if (error.response) {
        console.error("API Error Data:", error.response.data);
        console.error("API Error Status:", error.response.status);
        throw error.response.data; // Throw the actual error message from backend
    } else {
        console.error("Network/Unknown Error:", error.message);
        throw new Error("Network error or server is unreachable.");
    }
};

/** A retried purchase carries the same key, so the server returns the first result instead of buying twice. */
const idemHeaders = (key?: string) => (key ? { headers: { 'Idempotency-Key': key } } : undefined);

export const marketAPI = {
    // Expose core axios methods
    get: api.get,
    post: api.post,
    put: api.put,
    delete: api.delete,

    // --- BROWSING & SEARCH ---

    /**
     * Fetch all categories
     */
    getCategories: async () => {
        try {
            const response = await api.get('/market/categories/');
            return response.data;
        } catch (error) {
            return handleApiError(error);
        }
    },

    // 🟢 Clean, optimized product collection pull
    getProducts: async (search?: string | null, category?: number | string | null, storeId?: number | string | null) => {
        try {
            const response = await api.get('/market/products/', {
                params: {
                    ...(search ? { search } : {}),
                    ...(category ? { category } : {}),
                    ...(storeId ? { shop: storeId } : {}),
                },
            });
            return response.data; // This returns the array of items directly
        } catch (error) {
            console.error("Error fetching market inventory items:", error);
            throw error;
        }
    },

    // --- MESSAGING ---
    startConversation: async (receiverId: number, productId: number | null = null) => {
        try {
            const response = await api.post('/chat/start/', {
                receiver_id: receiverId,
                product_id: productId
            });
            return response.data;
        } catch (error) {
            return handleApiError(error);
        }
    },

    /**
     * Get single store details
     */
    getStoreById: async (id: number) => {
        try {
            const response = await api.get(`/market/stores/${id}/`);
            return response.data;
        } catch (error) {
            return handleApiError(error);
        }
    },

    /**
     * Get single product details
     */
    getProductById: async (id: number) => {
        try {
            const response = await api.get(`/market/products/${id}/`);
            return response.data;
        } catch (error) {
            return handleApiError(error);
        }
    },

    // --- CART MANAGEMENT ---

    /**
     * Get current user's cart
     */
    getCart: async () => {
        try {
            const response = await api.get('/market/cart/');
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 400 && error.response?.data?.message?.includes('empty')) {
                return { items: [], total_price: 0 };
            }
            return handleApiError(error);
        }
    },

    /**
     * Add item to cart
     */
    addToCart: async (productId: number, quantity: number = 1) => {
        try {
            const payload = { product_id: productId, quantity };
            const response = await api.post('/market/cart/', payload);
            return response.data;
        } catch (error) {
            return handleApiError(error);
        }
    },

    /**
     * Remove specific item from cart
     */
    removeFromCart: async (itemId: number) => {
        try {
            // Backend expects 'item_id' in body for DELETE requests
            const response = await api.delete('/market/cart/', { data: { item_id: itemId } });
            return response.data;
        } catch (error) {
            return handleApiError(error);
        }
    },

    // --- ORDER & CHECKOUT ---

    /**
     * Checkout (multiple cart items, pays via wallet in one call)
     */
    checkout: async (payload: {
        items: { product_id: number; quantity: number }[];
        shipping_address: { address: string; city: string; phone: string };
        payment_method?: string;
        pin?: string;
    }, idempotencyKey?: string) => {
        try {
            const response = await api.post(
                '/market/checkout/',
                payload,
                idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined,
            );
            return response.data;
        } catch (error) {
            return handleApiError(error);
        }
    },

    /**
     * Buy now (single product, immediate purchase with wallet)
     */
    buyNow: async (payload: {
        product_id: number;
        quantity: number;
        shipping_address: { address: string; city: string; phone: string };
        payment_method?: string;
        pin?: string;
    }) => {
        try {
            const response = await api.post('/market/buy-now/', payload);
            return response.data;
        } catch (error) {
            return handleApiError(error);
        }
    },

    /**
     * Track Orders (Order History)
     */
    getMyOrders: async () => {
        try {
            const response = await api.get('/market/buyer/orders/');
            return response.data;
        } catch (error) {
            return handleApiError(error);
        }
    },

    getOrderById: async (orderId: number) => {
        try {
            const response = await api.get(`/market/buyer/orders/${orderId}/`);
            return response.data;
        } catch (error) {
            // @ts-ignore
            if (error.response) throw error.response.data;
            throw new Error("Network error");
        }
    },

    getWallet: async () => {
        try {
            const response = await api.get('/finance/wallet/');
            return response.data;
        } catch (error) {
            console.error("Wallet Fetch Error:", error);
            // Return a default object so the UI doesn't crash
            return {
                balance: "0.00",
                escrow_balance: "0.00",
                account_number: "Error Loading",
                bank_name: "Try Again Later"
            };
        }
    },

    // Since WalletDetailView already includes history, this is optional but good for backup
    getTransactions: async () => {
        const response = await api.get('/finance/wallet/');
        return response.data.transactions || [];
    },

    initiateDeposit: async (amount: number) => {
        try {
            const response = await api.post('/finance/deposit/initiate/', { amount });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    getBanks: async () => {
        try {
            const response = await api.get('/finance/banks/');
            return response.data;
        } catch (error) {
            return handleApiError(error);
        }
    },

    verifyBankAccount: async (accountNumber: string, bankCode: string) => {
        try {
            const response = await api.get('/finance/verify-bank/', {
                params: {
                    account_number: accountNumber,
                    bank_code: bankCode,
                },
            });
            const data = response.data;
            return typeof data === 'string' ? data : data.account_name || data.name || data;
        } catch (error) {
            return handleApiError(error);
        }
    },

    initiateWithdrawal: async (amount: number, accountNumber: string, bankCode: string, pin: string, bankName?: string, accountName?: string) => {
        try {
            const response = await api.post('/finance/withdraw/', {
                amount: amount.toString(),
                bank_code: bankCode,
                bank_name: bankName,
                account_number: accountNumber,
                account_name: accountName,
                pin: pin,
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    fetchDataHistory: async () => {
        const response = await api.get('/finance/data/history/');
        return response.data;
    },

    fetchDataPlans: async (networkId: string) => {
        const response = await api.get('/finance/data/plans/', { params: { service_id: networkId } });
        return response.data.plans;
    },

    purchaseData: async (data: { service_id: string; variation_code: string; phone: string; amount: number }, idempotencyKey?: string) => {
        const response = await api.post('/finance/data/purchase/', data, idemHeaders(idempotencyKey));
        return response.data;
    },

    purchaseAirtime: async (data: { service_id: string; phone: string; amount: number }, idempotencyKey?: string) => {
        const response = await api.post('/finance/airtime/purchase/', data, idemHeaders(idempotencyKey));
        return { ...response.data, http_status: response.status };
    },

    fetchDiscos: async () => {
        const response = await api.get('/finance/electricity/discos/');
        return response.data as { discos: { code: string; name: string }[]; meter_types: string[]; minimum_amount: string; service_fee: string };
    },

    verifyMeter: async (disco: string, meter_no: string, meter_type: string) => {
        const response = await api.get('/finance/electricity/verify/', { params: { disco, meter_no, meter_type } });
        return response.data as { customer_name: string };
    },

    purchaseElectricity: async (data: { disco: string; meter_no: string; meter_type: string; phone: string; amount: number }, idempotencyKey?: string) => {
        const response = await api.post('/finance/electricity/purchase/', data, idemHeaders(idempotencyKey));
        return { ...response.data, http_status: response.status };
    },

    fetchCablePlans: async (cable_tv: string) => {
        const response = await api.get('/finance/cable/plans/', { params: { cable_tv } });
        return response.data.results as { package_id: string; name: string; price: string }[];
    },

    verifySmartcard: async (cable_tv: string, smartcard: string) => {
        const response = await api.get('/finance/cable/verify/', { params: { cable_tv, smartcard } });
        return response.data as { customer_name: string };
    },

    purchaseCable: async (data: { cable_tv: string; package_id: string; smartcard: string; phone: string }, idempotencyKey?: string) => {
        const response = await api.post('/finance/cable/purchase/', data, idemHeaders(idempotencyKey));
        return { ...response.data, http_status: response.status };
    },

    updateBVN: async (bvn: string) => {
        const response = await api.post('/users/update-bvn/', { bvn });
        return response.data;
    },

    requestPasswordReset: async (email: string) => {
        if (__DEV__) console.log('[password-reset] request ->', { email });
        try {
            const response = await api.post('/users/password-reset/request/', { email });
            if (__DEV__) console.log('[password-reset] request <-', response.status, response.data);
            return response.data;
        } catch (error: any) {
            if (__DEV__) console.log('[password-reset] request FAILED <-', error.response?.status, error.response?.data || error.message);
            throw error;
        }
    },

    confirmPasswordReset: async (email: string, otp: string, new_password: string) => {
        if (__DEV__) console.log('[password-reset] confirm ->', { email });
        try {
            const response = await api.post('/users/password-reset/confirm/', { email, otp, new_password });
            if (__DEV__) console.log('[password-reset] confirm <-', response.status, response.data);
            return response.data;
        } catch (error: any) {
            if (__DEV__) console.log('[password-reset] confirm FAILED <-', error.response?.status, error.response?.data || error.message);
            throw error;
        }
    },

    setTransactionPin: async (pin: string, oldPin?: string | null) => {
        const response = await api.post('/finance/pin/', { pin, old_pin: oldPin || undefined });
        return response.data;
    },

    addProduct: async (data: any) => {
        const isPreUploaded =
            (data.images && data.images.length > 0 && typeof data.images[0] === 'string' && data.images[0].startsWith('http')) ||
            data.video_url;

        if (isPreUploaded) {
            try {
                const response = await api.post('/market/seller/products/add/', data);
                return response.data;
            } catch (error: any) {
                if (error.response) throw error.response.data;
                throw error;
            }
        }

        const formData = new FormData();
        formData.append("name", data.name);
        formData.append("description", data.description);
        formData.append("price", data.price);
        formData.append("stock", data.stock || "1");
        formData.append("category", data.category || "1");
        formData.append("is_ad", "true");

        if (data.images && data.images.length > 0) {
            data.images.forEach((uri: string, index: number) => {
                // @ts-ignore
                formData.append("images", {
                    uri,
                    name: `prod_img_${index}.jpg`,
                    type: "image/jpeg",
                });
            });
        }

        if (data.video) {
            // @ts-ignore
            formData.append("video", {
                uri: data.video,
                name: "seller_video.mp4",
                type: "video/mp4",
            });
            formData.append("resource_type", "video");
        }

        try {
            const response = await api.post('/market/seller/products/add/', formData, {
                headers: { "Content-Type": undefined },
                transformRequest: (data, headers) => {
                    delete headers['Content-Type'];
                    return data;
                },
                timeout: 300000,
            });
            return response.data;
        } catch (error) {
            console.error("Video Upload Error:", error);
            throw error;
        }
    },

    updateProduct: async (id: number, data: any) => {
        try {
            const response = await api.patch(`/market/seller/products/${id}/`, data);
            return response.data;
        } catch (error: any) {
            console.error('Update Product Error:', error.response?.status, error.response?.data);
            if (error.response) throw error.response.data;
            throw error;
        }
    },

    getSellerStats: async () => {
        try {
            const response = await api.get('/merchant/dashboard-stats/');
            return response.data;
        } catch (error) { throw error; }
    },

    getSellerProducts: async () => {
        try {
            const response = await api.get('/market/seller/products/');
            return response.data;
        } catch (error) { throw error; }
    },

    getSellerOrders: async () => {
        try {
            const response = await api.get('/market/seller/orders/');
            return response.data;
        } catch (error) { throw error; }
    },

    confirmOrderReceipt: async (orderId: number) => {
        try {
            const response = await api.post(`/market/buyer/orders/${orderId}/confirm/`);
            return response.data;
        } catch (error: any) {
            if (error.response) throw error.response.data;
            throw error;
        }
    },

    openDispute: async (orderId: number, reason: string, description: string) => {
        try {
            const response = await api.post(`/market/buyer/orders/${orderId}/dispute/`, { reason, description });
            return response.data;
        } catch (error: any) {
            if (error.response) throw error.response.data;
            throw error;
        }
    },

    withdrawDispute: async (orderId: number) => {
        try {
            const response = await api.post(`/market/buyer/orders/${orderId}/dispute/withdraw/`);
            return response.data;
        } catch (error: any) {
            if (error.response) throw error.response.data;
            throw error;
        }
    },

    cancelOrder: async (orderId: number) => {
        try {
            const response = await api.post(`/market/buyer/orders/${orderId}/cancel/`);
            return response.data;
        } catch (error: any) {
            if (error.response) throw error.response.data;
            throw error;
        }
    },

    markOrderDispatched: async (orderId: number) => {
        try {
            const response = await api.patch(`/market/seller/orders/${orderId}/`, { delivery_status: 'shipped' });
            return response.data;
        } catch (error: any) {
            if (error.response) throw error.response.data;
            throw error;
        }
    },



    getAdminStats: async () => {
        try {
            const response = await api.get('/market/admin/stats/');
            return response.data;
        } catch (error) { throw error; }
    },

    // --- KYC FUNCTIONS ---
    submitKYC: async (formData: FormData) => {
        try {
            // Important: We send FormData, so we let the browser/native set Content-Type
            const response = await api.post('/users/kyc/upload/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return response.data;
        } catch (error) { throw error; }
    },

    getPendingKYC: async () => {
        try {
            const response = await api.get('/users/admin/kyc/pending/');
            return response.data;
        } catch (error) { throw error; }
    },

    adminKYCAction: async (userId: number, action: 'approve' | 'reject') => {
        try {
            const response = await api.post(`/users/admin/kyc/${userId}/action/`, { action });
            return response.data;
        } catch (error) { throw error; }
    },

    // --- CHAT FUNCTIONS ---
    startChat: async (userId: number, productId?: number) => {
        const response = await api.post('/chat/start/', {
            user_id: userId,
            product_id: productId
        });
        return response.data;
    },

    sendMessage: async (conversationId: number, text: string) => {
        const response = await api.post(`/chat/conversations/${conversationId}/send/`, { text });
        return response.data;
    },

    getMessages: async (conversationId: number, lastId: number = 0) => {
        // Yusuf: This sends /api/chat/conversations/5/messages/?last_id=10
        const response = await api.get(`/chat/conversations/${conversationId}/messages/`, {
            params: { last_id: lastId }
        });
        return response.data;
    },

    getConversations: async () => {
        const { data } = await api.get('/market/conversations/');
        return data;
    },


    getOrderDetail: async (id: string | string[]) => {
        const response = await api.get(`/market/seller/orders/${id}/`);
        return response.data;
    },

    getAllStores: async () => {
        try {
            // Adjust the endpoint if your backend path is different
            const response = await api.get('/market/stores/');
            return response.data.results || response.data;
        } catch (error) {
            console.error("Error fetching stores:", error);
            throw error;
        }
    },

    getStoreDetail: async (id: string | number) => {
        try {
            const response = await api.get(`/market/stores/${id}/`);
            return response.data;
        } catch (error) {
            console.error("Error fetching store detail:", error);
            throw error;
        }
    },
    getActivePromotedPosts: async () => {
        try {
            const response = await api.get('/market/promoted-posts/active/');
            return response.data;
        } catch (error) {
            console.error("Error fetching promoted posts:", error);
            return [];
        }
    },

    getPromotedPostPricing: async () => {
        try {
            const response = await api.get('/market/promoted-posts/pricing/');
            return response.data;
        } catch (error) {
            console.error("Error fetching promoted post pricing:", error);
            return [];
        }
    },

    createPromotedPost: async (data: {
        text_content: string;
        duration_type: '24h' | '3days' | '1wk';
        promotion_type: 'product' | 'standalone';
        product?: number;
        title?: string;
        description?: string;
        price?: number | string;
        location?: string;
        phone_number?: string;
        category?: number;
        images?: string[];
    }) => {
        const response = await api.post('/market/promoted-posts/', data);
        return response.data;
    },

    // Public lookup by the shareable short code — backs the deep link
    // GLAPP://promotion/<code> and https://<host>/promotion/<code>.
    // Throws with error.response.status 404 (unknown) or 410 (expired/removed).
    getPromotionByCode: async (code: string) => {
        const response = await api.get(`/market/promotions/${encodeURIComponent(code)}/`);
        return response.data;
    },

    getVideoAds: async (pageNum: number = 1) => {
        try {
            const response = await api.get('/market/video-ads/', {
                params: { page: pageNum }
            });
            // Django results usually come in a 'results' key if paginated
            return response.data.results || response.data;
        } catch (error) {
            console.error("Video Ads Fetch Error:", error);
            return [];
        }
    },



    updateOrderStatus: async (orderId: number, status: string) => {
        try {
            // ENSURE THE TRAILING SLASH IS PRESENT
            const response = await api.post(`/market/seller/orders/status-change/${orderId}/`, { status });
            return response.data;
        } catch (error: any) {
            if (error.response) throw error.response.data;
            throw error;
        }
    },

    getReadyJobs: async () => {
        try {
            const response = await api.get('/market/seller/orders/ready-for-pickup/');
            return response.data;
        } catch (error) { throw error; }
    },


    // --- STORE MANAGEMENT ---

    getMyStore: async () => {
        try {
            const response = await api.get('/market/store/detail/');
            return response.data;
        } catch (error) {
            return handleApiError(error);
        }
    },

    updateStore: async (data: { name?: string; description?: string; logo?: string }) => {
        try {
            const response = await api.patch('/market/store/update/', data);
            return response.data;
        } catch (error) {
            return handleApiError(error);
        }
    },

    /**
     * Check if a shop name is available
     */
    checkShopName: async (name: string): Promise<{ available: boolean; message?: string }> => {
        try {
            const response = await api.get('/market/store/check-name/', {
                params: { name: name.trim() },
            });
            return response.data;
        } catch (error: any) {
            if (error.response?.data) {
                return error.response.data;
            }
            return { available: true };
        }
    },

};
