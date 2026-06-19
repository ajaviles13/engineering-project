import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import type { RuleSetContent } from '../types'
import { buildRuleSetCategoryOptions } from '../lib/categoryStyles'

export function useRuleSetCategories() {
  const { data, isLoading } = useQuery<{ rule_set: RuleSetContent }>({
    queryKey: ['rule_set'],
    queryFn: () => api.get('/rule_set').then(r => r.data),
    staleTime: 60_000
  })

  const parentCategories = useMemo(() => {
    if (!data?.rule_set?.categories) return []
    return Object.keys(data.rule_set.categories).sort((a, b) => a.localeCompare(b))
  }, [data])

  const categoryOptions = useMemo(() => {
    if (!data?.rule_set?.categories) return []
    return buildRuleSetCategoryOptions(data.rule_set.categories)
  }, [data])

  return { parentCategories, categoryOptions, isLoading }
}
