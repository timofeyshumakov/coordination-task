import { ref, computed, onMounted } from 'vue'
import { callApi } from '../functions/callApi'
import {
  COORDINATION_ENTITY_TYPE_ID,
  COORDINATION_STAGE_ID,
  COORDINATION_STAGE_REJECTED,
  COORDINATION_STAGE_APPROVED,
  COORDINATION_REJECT_COMMENT_FIELD,
  COORDINATION_FIELD_LABELS,
  COORDINATION_INVOICE_FILE_FIELD,
} from '../constants/coordinationApproval'
import { updateCoordinationItem } from '../functions/updateCoordinationItem'

export interface CoordinationRow {
  id: number
  title: string
  explanation: string
  responsible: string
  department: string
  amountText: string
  amountRaw: number
  invoiceFileLabel: string
  invoiceFileUrl: string | null
}

type FieldsMeta = Record<string, { title?: string; formLabel?: string; type?: string }>

function findFieldCode(meta: FieldsMeta, labels: readonly string[]): string | null {
  for (const [code, field] of Object.entries(meta)) {
    const title = String(field?.title || field?.formLabel || '').toLowerCase()
    if (labels.some((label) => title.includes(label))) {
      return code
    }
  }
  return null
}

function normalizeFileValue(raw: unknown): { label: string; url: string | null } {
  if (!raw) {
    return { label: '—', url: null }
  }
  if (Array.isArray(raw) && raw.length > 0) {
    return normalizeFileValue(raw[0])
  }
  if (typeof raw === 'object' && raw !== null) {
    const file = raw as { urlMachine?: string; url?: string; name?: string }
    const url = file.urlMachine || file.url || null
    return { label: file.name || 'Файл', url }
  }
  if (typeof raw === 'string' && raw.startsWith('http')) {
    return { label: 'Файл', url: raw }
  }
  return { label: String(raw), url: null }
}

export function formatCompactRub(amount: number, currencyId = 'RUB'): string {
  const symbol = currencyId === 'RUB' ? '₽' : currencyId
  const abs = Math.abs(amount)
  if (abs >= 1_000_000) {
    const value = amount / 1_000_000
    const rounded = Number.isInteger(value) ? value : Math.round(value * 10) / 10
    return `${rounded} млн. ${symbol}`
  }
  if (abs >= 1_000) {
    return `${Math.round(amount / 1_000)} тыс. ${symbol}`
  }
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: currencyId,
    maximumFractionDigits: 0,
  }).format(amount)
}

function getUserName(usersMap: Map<number, string>, userId: unknown): string {
  const id = Number(userId)
  if (!id) return '—'
  return usersMap.get(id) || `ID ${id}`
}

function getDepartmentName(
  usersMap: Map<number, { name: string; deptIds: number[] }>,
  departmentsMap: Map<number, string>,
  userId: unknown,
  itemDepartment: unknown,
): string {
  if (itemDepartment != null && itemDepartment !== '') {
    return String(itemDepartment)
  }
  const id = Number(userId)
  const user = usersMap.get(id)
  if (!user?.deptIds?.length) return '—'
  return user.deptIds.map((deptId) => departmentsMap.get(deptId) || `Отдел ${deptId}`).join(', ')
}

export function useCoordinationApproval() {
  const rows = ref<CoordinationRow[]>([])
  const isLoading = ref(false)
  const isActionLoading = ref(false)
  const error = ref<string | null>(null)
  const rejectDialog = ref(false)
  const rejectComment = ref('')
  const rejectTarget = ref<CoordinationRow | null>(null)
  const customFieldCodes = ref({
    explanation: null as string | null,
    department: null as string | null,
    invoiceFile: null as string | null,
  })

  const itemsCount = computed(() => rows.value.length)
  const totalAmountRaw = ref(0)
  const totalAmountText = computed(() => formatCompactRub(totalAmountRaw.value))

  async function resolveFieldCodes(): Promise<string[]> {
    const fieldsResponse = await callApi('crm.item.fields', {}, [], COORDINATION_ENTITY_TYPE_ID, null, null)
    const meta: FieldsMeta =
      (fieldsResponse as { fields?: FieldsMeta })?.fields ||
      (Array.isArray(fieldsResponse) ? {} : (fieldsResponse as FieldsMeta)) ||
      {}

    customFieldCodes.value = {
      explanation: findFieldCode(meta, COORDINATION_FIELD_LABELS.explanation),
      department: findFieldCode(meta, COORDINATION_FIELD_LABELS.department),
      invoiceFile: COORDINATION_INVOICE_FILE_FIELD,
    }

    const select = new Set<string>([
      'id',
      'title',
      'assignedById',
      'opportunity',
      'currencyId',
      'stageId',
    ])

    Object.values(customFieldCodes.value).forEach((code) => {
      if (code) select.add(code)
    })

    return [...select]
  }

  async function loadUsers(userIds: number[]) {
    if (!userIds.length) {
      return {
        names: new Map<number, string>(),
        profiles: new Map<number, { name: string; deptIds: number[] }>(),
      }
    }

    const users = await callApi('user.get', { ID: userIds }, ['ID', 'NAME', 'LAST_NAME', 'UF_DEPARTMENT'], null, null, null)
    const names = new Map<number, string>()
    const profiles = new Map<number, { name: string; deptIds: number[] }>()

    for (const user of users || []) {
      const id = Number(user.ID)
      const fullName = [user.NAME, user.LAST_NAME].filter(Boolean).join(' ').trim() || `ID ${id}`
      const deptRaw = user.UF_DEPARTMENT
      const deptIds = Array.isArray(deptRaw) ? deptRaw.map(Number).filter(Boolean) : deptRaw ? [Number(deptRaw)] : []
      names.set(id, fullName)
      profiles.set(id, { name: fullName, deptIds })
    }

    return { names, profiles }
  }

  async function loadDepartments(deptIds: number[]) {
    const map = new Map<number, string>()
    if (!deptIds.length) return map

    const uniqueIds = [...new Set(deptIds)]
    const departments = await callApi(
      'department.get',
      { ID: uniqueIds },
      ['ID', 'NAME'],
      null,
      null,
      null,
    )

    for (const dept of departments || []) {
      map.set(Number(dept.ID), dept.NAME)
    }
    return map
  }

  async function fetchItems() {
    isLoading.value = true
    error.value = null

    try {
      const select = await resolveFieldCodes()
      const rawItems =
        (await callApi(
          'crm.item.list',
          { stageId: COORDINATION_STAGE_ID },
          select,
          COORDINATION_ENTITY_TYPE_ID,
          null,
          null,
        )) || []

      const assignedIds = [
        ...new Set(
          rawItems.map((item) => Number(item.assignedById)).filter((id) => Number.isFinite(id) && id > 0),
        ),
      ]

      const { names: userNames, profiles: userProfiles } = await loadUsers(assignedIds)
      const allDeptIds = assignedIds.flatMap((id) => userProfiles.get(id)?.deptIds || [])
      const departmentsMap = await loadDepartments(allDeptIds)

      const { explanation, department, invoiceFile } = customFieldCodes.value

      totalAmountRaw.value = rawItems.reduce(
        (sum, item) => sum + (parseFloat(item.opportunity) || 0),
        0,
      )

      rows.value = rawItems.map((item) => {
        const amount = parseFloat(item.opportunity) || 0
        const currencyId = item.currencyId || 'RUB'
        const file = normalizeFileValue(invoiceFile ? item[invoiceFile] : null)

        return {
          id: Number(item.id),
          title: item.title || '—',
          explanation: explanation ? String(item[explanation] ?? '—') : '—',
          responsible: getUserName(userNames, item.assignedById),
          department: getDepartmentName(
            userProfiles,
            departmentsMap,
            item.assignedById,
            department ? item[department] : null,
          ),
          amountText: formatCompactRub(amount, currencyId),
          amountRaw: amount,
          invoiceFileLabel: file.label,
          invoiceFileUrl: file.url,
        }
      })
    } catch (e) {
      console.error(e)
      error.value = 'Не удалось загрузить элементы согласования'
      rows.value = []
      totalAmountRaw.value = 0
    } finally {
      isLoading.value = false
    }
  }

  function removeRow(rowId: number) {
    const row = rows.value.find((r) => r.id === rowId)
    if (row) {
      totalAmountRaw.value = Math.max(0, totalAmountRaw.value - row.amountRaw)
    }
    rows.value = rows.value.filter((r) => r.id !== rowId)
  }

  function openRejectDialog(row: CoordinationRow) {
    rejectTarget.value = row
    rejectComment.value = ''
    rejectDialog.value = true
  }

  function closeRejectDialog() {
    rejectDialog.value = false
    rejectTarget.value = null
    rejectComment.value = ''
  }

  async function confirmReject() {
    const row = rejectTarget.value
    if (!row || isActionLoading.value) return

    isActionLoading.value = true
    error.value = null

    try {
      const fields: Record<string, unknown> = {
        stageId: COORDINATION_STAGE_REJECTED,
        [COORDINATION_REJECT_COMMENT_FIELD]: rejectComment.value.trim(),
      }

      await updateCoordinationItem(row.id, fields)
      removeRow(row.id)
      closeRejectDialog()
    } catch (e) {
      console.error(e)
      error.value = 'Не удалось отклонить элемент'
    } finally {
      isActionLoading.value = false
    }
  }

  async function approveItem(row: CoordinationRow) {
    if (isActionLoading.value) return

    isActionLoading.value = true
    error.value = null

    try {
      await updateCoordinationItem(row.id, { stageId: COORDINATION_STAGE_APPROVED })
      removeRow(row.id)
    } catch (e) {
      console.error(e)
      error.value = 'Не удалось согласовать элемент'
    } finally {
      isActionLoading.value = false
    }
  }

  onMounted(fetchItems)

  return {
    rows,
    isLoading,
    isActionLoading,
    error,
    itemsCount,
    totalAmountText,
    rejectDialog,
    rejectComment,
    rejectTarget,
    fetchItems,
    openRejectDialog,
    closeRejectDialog,
    confirmReject,
    approveItem,
  }
}
