import './App.css'
import DataList from './components/DataList/DataList'

type Print = {
  id: number
  name: string
  skill: string
  grade: string
}

const testPrints: Print[] = [
  {
    id: 4444,
    name: 'Sagely Healing Brew',
    skill: 'Culinary',
    grade: 'Proficient',
  },
  {
    id: 4597,
    name: '.38 Caliber Privacy Pipes',
    skill: 'Artisan',
    grade: 'Master',
  },
]

const printColumns: { key: keyof Print; label: string }[] = [
  { key: 'name', label: 'Item' },
  { key: 'skill', label: 'Skill' },
  { key: 'grade', label: 'Grade' },
]

function App() {
  const handleAddPrint = () => {
    alert('Add event received.')
  }

  return (
    <main>
      <h1>Wasteland Workshop</h1>
      <p>Dystopia Rising crafting economics and build planning.</p>

      <h2>Prints</h2>

      <DataList<Print>
        getRowKey={(item) => item.id}
        items={testPrints}
        columns={printColumns}
        showAddButton={true}
        onAdd={handleAddPrint}
        emptyMessage='No Prints in here'
      />
    </main>
  )
}

export default App