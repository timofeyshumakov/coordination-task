<template>
  <section class="coordination-board">
    <div class="coordination-board__kpis">
      <article class="coordination-kpi">
        <span class="coordination-kpi__label">НА СОГЛАСОВАНИИ</span>
        <strong class="coordination-kpi__value">{{ itemsCount }}</strong>
      </article>
      <article class="coordination-kpi">
        <span class="coordination-kpi__label">СУММА В РАБОТЕ</span>
        <strong class="coordination-kpi__value">{{ totalAmountText }}</strong>
      </article>
    </div>

    <p v-if="error" class="coordination-board__error">{{ error }}</p>

    <v-data-table
      :headers="headers"
      :items="rows"
      :loading="isLoading"
      item-value="id"
      class="coordination-data-table elevation-1"
      :items-per-page="10"
      :items-per-page-options="[10, 25, 50]"
      no-data-text="Нет элементов на стадии согласования"
    >
      <template #item.explanation="{ value }">
        <span class="coordination-data-table__wrap">{{ value }}</span>
      </template>

      <template #item.department="{ value }">
        <span class="coordination-data-table__wrap">{{ value }}</span>
      </template>

      <template #item.invoiceFile="{ item }">
        <a
          v-if="item.invoiceFileUrl"
          :href="item.invoiceFileUrl"
          target="_blank"
          rel="noopener noreferrer"
        >{{ item.invoiceFileLabel }}</a>
        <template v-else>{{ item.invoiceFileLabel }}</template>
      </template>

      <template #item.actions="{ item }">
        <div class="coordination-data-table__actions">
          <v-tooltip text="Отклонить" location="top">
            <template #activator="{ props: tooltipProps }">
              <button
                v-bind="tooltipProps"
                type="button"
                class="coordination-data-table__btn coordination-data-table__btn--reject"
                aria-label="Отклонить"
                :disabled="isActionLoading"
                @click.stop="openRejectDialog(item)"
              />
            </template>
          </v-tooltip>

          <v-tooltip text="Согласовать" location="top">
            <template #activator="{ props: tooltipProps }">
              <button
                v-bind="tooltipProps"
                type="button"
                class="coordination-data-table__btn coordination-data-table__btn--approve"
                aria-label="Согласовать"
                :disabled="isActionLoading"
                @click.stop="approveItem(item)"
              />
            </template>
          </v-tooltip>
        </div>
      </template>
    </v-data-table>

    <v-dialog v-model="rejectDialog" max-width="480" persistent>
      <v-card>
        <v-card-title>Отклонить</v-card-title>
        <v-card-text>
          <p v-if="rejectTarget" class="mb-3 text-medium-emphasis">
            {{ rejectTarget.title }}
          </p>
          <v-textarea
            v-model="rejectComment"
            label="Комментарий (необязательно)"
            rows="3"
            variant="outlined"
            hide-details
            auto-grow
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="isActionLoading" @click="closeRejectDialog">
            Отмена
          </v-btn>
          <v-btn
            color="error"
            :loading="isActionLoading"
            @click="confirmReject"
          >
            Отклонить
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>

<script setup lang="ts">
import { useCoordinationApproval } from '../../composables/useCoordinationApproval'
import type { CoordinationRow } from '../../composables/useCoordinationApproval'

const {
  rows,
  isLoading,
  isActionLoading,
  error,
  itemsCount,
  totalAmountText,
  rejectDialog,
  rejectComment,
  rejectTarget,
  openRejectDialog,
  closeRejectDialog,
  confirmReject,
  approveItem,
} = useCoordinationApproval()

const headers = [
  { title: 'Название', key: 'title', sortable: true },
  { title: 'Пояснение', key: 'explanation', sortable: false, cellClass: 'coordination-data-table__col-wrap' },
  { title: 'Ответственный', key: 'responsible', sortable: true },
  { title: 'Отдел', key: 'department', sortable: false, cellClass: 'coordination-data-table__col-wrap' },
  { title: 'Сумма и валюта', key: 'amountText', sortable: false, align: 'end' as const },
  { title: 'Файл счета', key: 'invoiceFile', sortable: false },
  { title: '', key: 'actions', sortable: false, width: 88, align: 'center' as const },
] satisfies ReadonlyArray<{
  title: string
  key: keyof CoordinationRow | 'invoiceFile' | 'actions'
  sortable?: boolean
  align?: 'start' | 'end' | 'center'
  width?: number
  cellClass?: string
}>
</script>

<style scoped lang="sass">
.coordination-board
  margin-bottom: 2rem
  padding: 1.5rem
  background-color: #ececec
  background-image: radial-gradient(#d4d4d4 1px, transparent 1px)
  background-size: 18px 18px
  border-radius: 8px

.coordination-board__kpis
  display: flex
  flex-wrap: wrap
  gap: 1.5rem
  margin-bottom: 1.5rem

.coordination-kpi
  flex: 1 1 220px
  max-width: 320px
  padding: 1.25rem 1.5rem
  background: #fff
  border-radius: 12px
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08)

.coordination-kpi__label
  display: block
  margin-bottom: 0.5rem
  font-size: 0.75rem
  font-weight: 600
  letter-spacing: 0.04em
  color: #9e9e9e
  text-transform: uppercase

.coordination-kpi__value
  font-size: 2rem
  font-weight: 700
  line-height: 1.1
  color: #212121

.coordination-board__error
  margin-bottom: 1rem
  color: #c62828

.coordination-data-table
  background: #fff
  border-radius: 8px

  :deep(.v-data-table__th)
    font-weight: 700
    color: #212121

  :deep(.v-data-table__td)
    font-weight: 700
    color: #212121

  :deep(.coordination-data-table__col-wrap)
    max-width: 14rem
    white-space: normal

.coordination-data-table__wrap
  display: inline-block
  max-width: 14rem
  white-space: normal
  overflow-wrap: anywhere
  word-break: break-word
  hyphens: auto

.coordination-data-table__actions
  display: flex
  align-items: center
  justify-content: center
  gap: 0.5rem

.coordination-data-table__btn
  width: 28px
  height: 28px
  padding: 0
  border: none
  border-radius: 50%
  cursor: pointer
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2)
  transition: transform 0.15s ease, background 0.15s ease, opacity 0.15s ease

  &:disabled
    opacity: 0.5
    cursor: not-allowed
    transform: none

  &:not(:disabled):hover
    transform: scale(1.08)

  &:not(:disabled):active
    transform: scale(0.96)

.coordination-data-table__btn--reject
  background: #e53935

  &:not(:disabled):hover
    background: #c62828

.coordination-data-table__btn--approve
  background: #43a047

  &:not(:disabled):hover
    background: #2e7d32

.coordination-data-table a
  color: inherit
  text-decoration: underline
</style>
