import { useState } from 'react'
import './index.css'
import './ui-cleanup.css'
import { AppHeader } from './components/AppHeader'
import { PosterWorkbench } from './components/PosterWorkbench'
import { ReportWorkbench } from './components/ReportWorkbench'

export default function App() {
  const [productMode, setProductMode] = useState('report')

  if (productMode === 'poster') {
    return <PosterWorkbench HeaderComponent={AppHeader} onProductModeChange={setProductMode} productMode={productMode} />
  }

  return <ReportWorkbench HeaderComponent={AppHeader} onProductModeChange={setProductMode} productMode={productMode} />
}
