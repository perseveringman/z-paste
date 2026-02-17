import { useEffect } from 'react'
import PanelWindow from './components/Panel/PanelWindow'
import { useClipboardStore } from './stores/clipboardStore'

function App(): React.JSX.Element {
  const { loadItems, addItem, setVisible } = useClipboardStore()

  useEffect(() => {
    loadItems()

    const unsubNewItem = window.api.onNewItem((item) => {
      addItem(item)
    })

    const unsubShown = window.api.onPanelShown(() => {
      setVisible(true)
      loadItems()
    })

    const unsubHidden = window.api.onPanelHidden(() => {
      setVisible(false)
    })

    return () => {
      unsubNewItem()
      unsubShown()
      unsubHidden()
    }
  }, [])

  return (
    <div className="w-full h-screen">
      <PanelWindow />
    </div>
  )
}

export default App
