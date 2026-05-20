/** Смарт-процесс «Согласование» */
export const COORDINATION_ENTITY_TYPE_ID = 1126

/** Стадия «На согласовании» */
export const COORDINATION_STAGE_ID = 'DT1126_144:UC_2M5QYG'

/** Стадия после отклонения */
export const COORDINATION_STAGE_REJECTED = 'DT1126_144:UC_CB3Y3K'

/** Стадия после согласования */
export const COORDINATION_STAGE_APPROVED = 'DT1126_144:CLIENT'

/** Поле комментария при отклонении */
export const COORDINATION_REJECT_COMMENT_FIELD = 'ufCrm72_1777556301690'

/** Поле «Файл счета» */
export const COORDINATION_INVOICE_FILE_FIELD = 'ufCrm72_1763041372161'

/** Подписи пользовательских полей для автопоиска в crm.item.fields */
export const COORDINATION_FIELD_LABELS = {
  explanation: ['пояснение'],
  department: ['отдел'],
} as const
