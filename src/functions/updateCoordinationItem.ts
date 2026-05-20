import { COORDINATION_ENTITY_TYPE_ID } from '../constants/coordinationApproval'

export function updateCoordinationItem(
  itemId: number,
  fields: Record<string, unknown>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    // @ts-ignore
    BX24.callMethod(
      'crm.item.update',
      {
        entityTypeId: COORDINATION_ENTITY_TYPE_ID,
        id: itemId,
        fields,
      },
      (res: { error: () => unknown; data: () => unknown }) => {
        if (res.error()) {
          reject(res.error())
          return
        }
        resolve()
      },
    )
  })
}
