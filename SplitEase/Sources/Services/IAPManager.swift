// IAPManager.swift
// アプリ内課金管理（StoreKit 2）

import StoreKit
import SwiftUI

@MainActor
class IAPManager: ObservableObject {
    @Published var isPremium: Bool = false
    @Published var products: [Product] = []
    @Published var purchaseError: String?

    // App Store Connect で設定する製品ID
    static let monthlyID = "com.splitease.premium.monthly"
    static let yearlyID = "com.splitease.premium.yearly"
    private let productIDs: Set<String> = [monthlyID, yearlyID]

    init() {
        Task { await checkEntitlements() }
        Task { await loadProducts() }
        observeTransactions()
    }

    // MARK: - 製品一覧取得
    func loadProducts() async {
        do {
            products = try await Product.products(for: productIDs)
                .sorted { $0.price < $1.price }
        } catch {
            purchaseError = "製品情報の取得に失敗しました"
        }
    }

    // MARK: - 購入
    func purchase(_ product: Product) async -> Bool {
        do {
            let result = try await product.purchase()
            switch result {
            case .success(let verification):
                let transaction = try checkVerified(verification)
                await transaction.finish()
                isPremium = true
                return true
            case .pending:
                purchaseError = "購入が保留中です"
                return false
            case .userCancelled:
                return false
            @unknown default:
                return false
            }
        } catch {
            purchaseError = "購入エラー: \(error.localizedDescription)"
            return false
        }
    }

    // MARK: - 購入復元
    func restore() async {
        try? await AppStore.sync()
        await checkEntitlements()
    }

    // MARK: - サブスクリプション状態確認
    func checkEntitlements() async {
        for await result in Transaction.currentEntitlements {
            if let transaction = try? checkVerified(result) {
                if productIDs.contains(transaction.productID) {
                    isPremium = true
                    return
                }
            }
        }
        isPremium = false
    }

    // MARK: - トランザクション監視
    private func observeTransactions() {
        Task.detached {
            for await result in Transaction.updates {
                if let transaction = try? self.checkVerified(result) {
                    await transaction.finish()
                    await MainActor.run {
                        self.isPremium = true
                    }
                }
            }
        }
    }

    // MARK: - 検証
    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified:
            throw StoreError.verificationFailed
        case .verified(let safe):
            return safe
        }
    }

    enum StoreError: Error {
        case verificationFailed
    }
}
