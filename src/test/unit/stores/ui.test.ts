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
      expect(store.activeTab).toBe(0)
      expect(store.alerts).toEqual([])
      expect(store.warningAlerts).toEqual([])
      expect(store.dangerAlerts).toEqual([])
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
      
      store.setActiveTab(1)
      expect(store.activeTab).toBe(1)
      
      store.setActiveTab(2)
      expect(store.activeTab).toBe(2)
    })

    it('should add alerts with unique IDs', () => {
      const store = useUIStore()
      
      store.addAlert('info', 'Info message')
      store.addAlert('danger', 'Error message')
      
      expect(store.alerts).toHaveLength(1)
      expect(store.dangerAlerts).toHaveLength(1)
      expect(store.alerts[0].type).toBe('info')
      expect(store.alerts[0].msg).toBe('Info message')
      expect(store.dangerAlerts[0].type).toBe('danger')
      expect(store.dangerAlerts[0].msg).toBe('Error message')
    })

    it('should remove alert by ID', () => {
      const store = useUIStore()
      
      store.addAlert('info', 'Info message')
      expect(store.alerts).toHaveLength(1)
      
      store.closeAlert(0, 'info')
      
      expect(store.alerts).toHaveLength(0)
    })

    it('should clear all alerts', () => {
      const store = useUIStore()
      
      store.addAlert('info', 'Message 1')
      store.addAlert('warning', 'Message 2')
      store.addAlert('danger', 'Message 3')
      
      expect(store.alerts).toHaveLength(1)
      expect(store.warningAlerts).toHaveLength(1)
      expect(store.dangerAlerts).toHaveLength(1)
      
      store.clearAllAlerts()
      
      expect(store.alerts).toHaveLength(0)
      expect(store.warningAlerts).toHaveLength(0)
      expect(store.dangerAlerts).toHaveLength(0)
    })

    it('should show modal', () => {
      const store = useUIStore()
      
      store.showModal('Test Modal', 'Modal content')
      
      expect(store.modalVisible).toBe(true)
      expect(store.modalContent).toEqual({ title: 'Test Modal', content: 'Modal content' })
    })

    it('should hide modal', () => {
      const store = useUIStore()
      
      store.showModal('Test Modal', 'Content')
      store.hideModal()
      
      expect(store.modalVisible).toBe(false)
      expect(store.modalContent).toBeNull()
    })
  })

  describe('Alert Management', () => {
    it('should handle multiple alert types', () => {
      const store = useUIStore()
      const alertTypes = ['info', 'warning', 'danger'] as const
      
      alertTypes.forEach(type => {
        store.addAlert(type, `${type} message`)
      })
      
      expect(store.alerts).toHaveLength(1) // only info
      expect(store.warningAlerts).toHaveLength(1)
      expect(store.dangerAlerts).toHaveLength(1)
      
      expect(store.alerts[0].msg).toBe('info message')
      expect(store.warningAlerts[0].msg).toBe('warning message')
      expect(store.dangerAlerts[0].msg).toBe('danger message')
    })

    it('should not remove non-existent alert', () => {
      const store = useUIStore()
      
      store.addAlert('info', 'Test message')
      const initialLength = store.alerts.length
      
      // Try to remove out of bounds index
      store.closeAlert(10, 'info')
      
      expect(store.alerts).toHaveLength(initialLength)
    })
  })
})