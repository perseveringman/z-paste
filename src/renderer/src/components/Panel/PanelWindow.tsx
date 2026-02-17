import SearchBar from './SearchBar'
import ClipboardList from './ClipboardList'
import { useKeyboard } from '../../hooks/useKeyboard'

export default function PanelWindow(): React.JSX.Element {
  useKeyboard()

  return (
    <div className="w-full h-full rounded-xl overflow-hidden bg-gray-900/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col animate-fade-in">
      <SearchBar />
      <ClipboardList />
    </div>
  )
}
