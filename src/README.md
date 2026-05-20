# Исходный код приложения «Согласование»

Актуальная документация — в корне репозитория: [README.md](../README.md).

## Ключевые модули

| Путь | Описание |
|------|----------|
| `pages/Home.vue` | Точка UI приложения |
| `components/coordination/CoordinationApprovalBoard.vue` | Таблица и KPI |
| `composables/useCoordinationApproval.ts` | Бизнес-логика |
| `constants/coordinationApproval.ts` | ID CRM, стадии, UF-поля |
| `functions/callApi.ts` | Чтение данных из Bitrix24 |
| `functions/updateCoordinationItem.ts` | Обновление элемента CRM |
