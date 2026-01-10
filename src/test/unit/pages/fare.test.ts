import { describe, it, expect } from 'vitest'

describe('FarePage Tab Navigation', () => {
  it('should have overflow-x-auto and scrollbar-hide classes for responsive design', () => {
    // This test verifies that the tab navigation includes the necessary CSS classes
    // to prevent overflow on smaller screens
    
    // Read the fare.vue file content to verify the classes are present
    const fs = require('fs')
    const filePath = '/Users/ag/works/FerryTransit/src/pages/fare.vue'
    const fileContent = fs.readFileSync(filePath, 'utf8')
    
    // Check if the tab navigation has the overflow handling classes
    expect(fileContent).toContain('overflow-x-auto')
    expect(fileContent).toContain('scrollbar-hide')
    expect(fileContent).toContain('flex-shrink-0')
    
    // Verify the old problematic classes are removed
    expect(fileContent).not.toContain('space-x-8')

    // Verify tab semantics & clearer "tab" styling exist
    expect(fileContent).toContain('role="tablist"')
    expect(fileContent).toContain('role="tab"')
    expect(fileContent).toContain('rounded-t-lg')
    expect(fileContent).toContain('gap-1')
    
    // Sticky tabs: keep the tab row visible when scrolling
    expect(fileContent).toContain('sticky')
    expect(fileContent).toContain('top-0')

    // Switching tabs scrolls back to the top (tab bar)
    expect(fileContent).toContain('scrollIntoView')
  })
  
  it('should have scrollbar-hide utility in Tailwind config', () => {
    const fs = require('fs')
    const tailwindConfigPath = '/Users/ag/works/FerryTransit/tailwind.config.js'
    const configContent = fs.readFileSync(tailwindConfigPath, 'utf8')
    
    // Verify the scrollbar-hide utility is configured
    expect(configContent).toContain('scrollbar-hide')
    expect(configContent).toContain('-ms-overflow-style')
    expect(configContent).toContain('scrollbar-width')
    expect(configContent).toContain('&::-webkit-scrollbar')
  })
  
  it('should have enhanced scrollbar hiding styles in global CSS', () => {
    const fs = require('fs')
    const cssPath = '/Users/ag/works/FerryTransit/src/assets/css/main.scss'
    const cssContent = fs.readFileSync(cssPath, 'utf8')
    
    // Verify enhanced scrollbar hiding styles
    expect(cssContent).toContain('.scrollbar-hide::-webkit-scrollbar')
    expect(cssContent).toContain('display: none !important')
    expect(cssContent).toContain('width: 0px !important')
    expect(cssContent).toContain('background: transparent !important')
  })
})
