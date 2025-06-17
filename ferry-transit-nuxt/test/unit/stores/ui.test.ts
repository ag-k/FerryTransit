import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUIStore } from '@/stores/ui'

describe('UI Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const store = useUIStore()
      
      expect(store.isLoading).toBe(false)
      expect(store.activeTab).toBe('timetable')
      expect(store.alerts).toEqual([])
      expect(store.modalVisible).toBe(false)
      expect(store.modalContent).toBeNull()
    })
  })

  describe('Actions', () => {
    it('should set loading state', () => {
      const store = useUIStore()
      
      store.setLoading(true)
      expect(store.isLoading).toBe(true)
      
      store.setLoading(false)
      expect(store.isLoading).toBe(false)
    })

    it('should set active tab', () => {
      const store = useUIStore()
      
      store.setActiveTab('transit')
      expect(store.activeTab).toBe('transit')
      
      store.setActiveTab('status')
      expect(store.activeTab).toBe('status')
    })

    it('should add alerts with unique IDs', () => {
      const store = useUIStore()
      
      store.addAlert('success', 'Success message')
      store.addAlert('danger', 'Error message')
      
      expect(store.alerts).toHaveLength(2)
      expect(store.alerts[0].type).toBe('success')
      expect(store.alerts[0].message).toBe('Success message')
      expect(store.alerts[1].type).toBe('danger')
      expect(store.alerts[1].message).toBe('Error message')
      
      // Check unique IDs
      expect(store.alerts[0].id).not.toBe(store.alerts[1].id)
    })

    it('should remove alert by ID', () => {
      const store = useUIStore()
      
      store.addAlert('info', 'Info message')
      const alertId = store.alerts[0].id
      
      store.removeAlert(alertId)
      
      expect(store.alerts).toHaveLength(0)
    })

    it('should clear all alerts', () => {
      const store = useUIStore()
      
      store.addAlert('success', 'Message 1')
      store.addAlert('warning', 'Message 2')
      store.addAlert('danger', 'Message 3')
      
      expect(store.alerts).toHaveLength(3)
      
      store.clearAlerts()
      
      expect(store.alerts).toHaveLength(0)
    })

    it('should show modal', () => {
      const store = useUIStore()
      const content = { title: 'Test Modal', body: 'Modal content' }
      
      store.showModal(content)
      
      expect(store.modalVisible).toBe(true)
      expect(store.modalContent).toEqual(content)
    })

    it('should hide modal', () => {
      const store = useUIStore()
      const content = { title: 'Test Modal' }
      
      store.showModal(content)
      store.hideModal()
      
      expect(store.modalVisible).toBe(false)
      expect(store.modalContent).toBeNull()
    })
  })

  describe('Alert Management', () => {
    it('should handle multiple alert types', () => {
      const store = useUIStore()
      const alertTypes = ['success', 'danger', 'warning', 'info', 'primary', 'secondary', 'light', 'dark'] as const
      
      alertTypes.forEach(type => {
        store.addAlert(type, `${type} message`)
      })
      
      expect(store.alerts).toHaveLength(alertTypes.length)
      
      store.alerts.forEach((alert, index) => {
        expect(alert.type).toBe(alertTypes[index])
        expect(alert.message).toBe(`${alertTypes[index]} message`)
      })
    })

    it('should not remove non-existent alert', () => {
      const store = useUIStore()
      
      store.addAlert('info', 'Test message')
      const initialLength = store.alerts.length
      
      store.removeAlert('non-existent-id')
      
      expect(store.alerts).toHaveLength(initialLength)
    })
  })
})