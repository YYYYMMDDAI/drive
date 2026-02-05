// PersistenceController.swift
// Core Data永続化コントローラ（ローカル完結・サーバー不使用）

import CoreData

struct PersistenceController {
    static let shared = PersistenceController()

    let container: NSPersistentContainer

    init(inMemory: Bool = false) {
        container = NSPersistentContainer(name: "SplitEaseModel")

        if inMemory {
            container.persistentStoreDescriptions.first?.url = URL(fileURLWithPath: "/dev/null")
        }

        container.loadPersistentStores { _, error in
            if let error = error as NSError? {
                // 本番ではクラッシュレポートに記録
                fatalError("Core Data読み込みエラー: \(error), \(error.userInfo)")
            }
        }

        container.viewContext.automaticallyMergesChangesFromParent = true
        container.viewContext.mergePolicy = NSMergeByPropertyObjectTrumpMergePolicy
    }

    // テスト用プレビュー
    static var preview: PersistenceController = {
        let controller = PersistenceController(inMemory: true)
        return controller
    }()

    // カスタムプリセット保存
    func saveCustomPreset(_ preset: Preset, context: NSManagedObjectContext) {
        let entity = PairEntity(context: context)
        entity.id = preset.id
        entity.name = preset.name
        entity.topURL = preset.topURL
        entity.bottomURL = preset.bottomURL
        entity.presetDescription = preset.description
        entity.isDefault = preset.isDefault
        entity.createdAt = Date()

        do {
            try context.save()
        } catch {
            print("保存エラー: \(error)")
        }
    }

    // カスタムプリセット取得
    func fetchCustomPresets(context: NSManagedObjectContext) -> [Preset] {
        let request: NSFetchRequest<PairEntity> = PairEntity.fetchRequest()
        request.sortDescriptors = [NSSortDescriptor(keyPath: \PairEntity.createdAt, ascending: true)]

        do {
            let entities = try context.fetch(request)
            return entities.map { entity in
                Preset(
                    id: entity.id ?? UUID(),
                    name: entity.name ?? "",
                    topURL: entity.topURL ?? "",
                    bottomURL: entity.bottomURL ?? "",
                    description: entity.presetDescription ?? "",
                    isDefault: entity.isDefault
                )
            }
        } catch {
            print("取得エラー: \(error)")
            return []
        }
    }

    // プリセット削除
    func deletePreset(id: UUID, context: NSManagedObjectContext) {
        let request: NSFetchRequest<PairEntity> = PairEntity.fetchRequest()
        request.predicate = NSPredicate(format: "id == %@", id as CVarArg)

        do {
            let results = try context.fetch(request)
            results.forEach { context.delete($0) }
            try context.save()
        } catch {
            print("削除エラー: \(error)")
        }
    }
}
