import { useMemo, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, Code2, FilePlus2, FolderOpen, Play, Plus, ShieldCheck, Sparkles, Trash2, X } from 'lucide-react'
import { analyzeProject, getCompatibilityWarnings, renderPreviewValue } from './workspace'

const templates = [
  { id: 'hub', title: 'Server hub', description: 'A clean starting point for a server navigator.' },
  { id: 'ranks', title: 'Rank store', description: 'Showcase rank tiers and server support.' },
  { id: 'rewards', title: 'Daily rewards', description: 'Daily and weekly reward entry points.' },
  { id: 'profile', title: 'Player profile', description: 'Player details, statistics and settings.' },
]
const defaultVariables = { '%player_name%': 'Steve', '%player_level%': '24', '%vault_eco_balance%': '1250.00' }

export default function StudioTools({ activeTool, onClose, config, validation, projectFiles, activeFile, onSwitchFile, onNewFile, onDeleteFile, onTemplate, onExportProject, targetVersion, setTargetVersion }) {
  const [selectedItem, setSelectedItem] = useState('')
  const [clickType, setClickType] = useState('left_click_commands')
  const [variables, setVariables] = useState(defaultVariables)
  const diagnostics = useMemo(() => [
    ...validation.errors.map(detail => ({ severity: 'error', title: 'Configuration error', detail })),
    ...validation.warnings.map(detail => ({ severity: 'warning', title: 'Configuration warning', detail })),
    ...analyzeProject(config, projectFiles.map(file => file.name)),
    ...getCompatibilityWarnings(config, targetVersion).map(detail => ({ severity: 'warning', title: 'Version compatibility', detail })),
  ], [config, validation, projectFiles, targetVersion])
  const itemEntries = Object.entries(config.items || {})
  const chosen = selectedItem && config.items[selectedItem] ? selectedItem : itemEntries[0]?.[0]
  const commands = chosen ? (config.items[chosen]?.[clickType] || []) : []
  const previewCommands = commands.map(command => renderPreviewValue(command, variables))
  const title = ({ project: 'Project', templates: 'Templates', debugger: 'Configuration debugger', simulator: 'Menu simulator', compatibility: 'Compatibility' })[activeTool] || 'Studio tools'

  return <div className="studio-tools-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="studio-tools" role="dialog" aria-modal="true" aria-label={title}>
      <header className="studio-tools-header">
        <div><span className="studio-tools-eyebrow">DELUXESTUDIO WORKSPACE</span><h2>{title}</h2></div>
        <button className="studio-tools-close" onClick={onClose} aria-label="Close tools"><X size={18}/></button>
      </header>
      <nav className="studio-tools-nav">
        {['project','templates','debugger','simulator','compatibility'].map((tool, index) => <button key={tool} className={activeTool === tool ? 'active' : ''} onClick={() => window.dispatchEvent(new CustomEvent('deluxestudio-tool', { detail: tool }))}>{['Project','Templates','Debugger','Simulator','Versions'][index]}</button>)}
      </nav>
      <div className="studio-tools-content">
        {activeTool === 'project' && <div className="tool-section">
          <div className="tool-intro"><FolderOpen size={20}/><div><h3>Menu project</h3><p>Keep related menu files together. Switch files without losing your current work.</p></div></div>
          <div className="tool-toolbar"><span>{projectFiles.length} menu file{projectFiles.length === 1 ? '' : 's'}</span><div><button className="tool-button" onClick={onNewFile}><Plus size={14}/> New menu</button><button className="tool-button primary" onClick={onExportProject}><Code2 size={14}/> Export project</button></div></div>
          <div className="project-file-list">{projectFiles.map(file => <div className={'project-file '+(file.id === activeFile ? 'selected' : '')} key={file.id}><button className="project-file-main" onClick={() => onSwitchFile(file.id)}><Code2 size={16}/><span><b>{file.name}</b><small>{file.id === activeFile ? 'Currently editing' : 'Saved in this browser'}</small></span></button><button className="project-file-delete" title={'Delete '+file.name} onClick={() => onDeleteFile(file.id)} disabled={projectFiles.length < 2}><Trash2 size={14}/></button></div>)}</div>
          <p className="tool-note">Project export creates a JSON bundle containing every menu's YAML. It does not deploy files to your Minecraft server.</p>
        </div>}
        {activeTool === 'templates' && <div className="tool-section">
          <div className="tool-intro"><Sparkles size={20}/><div><h3>Start from a useful structure</h3><p>Templates create a separate menu file. You can edit every item and replace all example actions.</p></div></div>
          <div className="template-grid">{templates.map(template => <article className="template-card" key={template.id}><div className="template-card-icon"><FilePlus2 size={20}/></div><h3>{template.title}</h3><p>{template.description}</p><button className="tool-button primary" onClick={() => onTemplate(template.id)}><Plus size={14}/> Use template</button></article>)}</div>
        </div>}
        {activeTool === 'debugger' && <div className="tool-section">
          <div className="tool-intro"><Activity size={20}/><div><h3>Project diagnostics</h3><p>Static checks for common configuration mistakes and broken project references.</p></div></div>
          <div className="diagnostic-summary"><b>{diagnostics.filter(item => item.severity === 'error').length} errors</b><span>{diagnostics.filter(item => item.severity === 'warning').length} warnings</span><span>{diagnostics.filter(item => item.severity === 'info').length} notes</span></div>
          {diagnostics.length ? <div className="diagnostic-list">{diagnostics.map((item, index) => <article className={'diagnostic-item '+item.severity} key={index}><div>{item.severity === 'error' ? <AlertTriangle size={16}/> : item.severity === 'warning' ? <AlertTriangle size={16}/> : <CheckCircle2 size={16}/>}</div><section><b>{item.title}</b><p>{item.detail}</p></section></article>)}</div> : <div className="tool-empty"><CheckCircle2 size={24}/><b>No issues detected</b><p>Static checks found no errors, warnings or project references to review.</p></div>}
          <p className="tool-note">These are static checks, not a substitute for loading the configuration on a test server. PlaceholderAPI expansions and plugin-specific conditions must be verified in your server environment.</p>
        </div>}
        {activeTool === 'simulator' && <div className="tool-section">
          <div className="tool-intro"><Play size={20}/><div><h3>Interaction preview</h3><p>Preview placeholder substitution and the commands attached to an item.</p></div></div>
          {itemEntries.length ? <>
            <label className="tool-field">Menu item<select value={chosen || ''} onChange={event => setSelectedItem(event.target.value)}>{itemEntries.map(([key, item]) => <option key={key} value={key}>{key} · {item.display_name || item.material}</option>)}</select></label>
            <label className="tool-field">Click type<select value={clickType} onChange={event => setClickType(event.target.value)}><option value="left_click_commands">Left click</option><option value="right_click_commands">Right click</option><option value="shift_left_click_commands">Shift + left click</option><option value="shift_right_click_commands">Shift + right click</option><option value="click_commands">Any click</option></select></label>
            <div className="simulator-vars">{Object.entries(variables).map(([key, value]) => <label className="tool-field" key={key}>{key}<input value={value} onChange={event => setVariables(current => ({ ...current, [key]: event.target.value }))}/></label>)}</div>
            <div className="simulator-output"><span>SIMULATED COMMAND OUTPUT</span>{previewCommands.length ? previewCommands.map((command, index) => <code key={index}>{command}</code>) : <p>No commands are configured for this click type.</p>}</div>
          </> : <div className="tool-empty"><b>No items to simulate</b><p>Add an item to the menu first.</p></div>}
          <p className="tool-note">This is a preview, not a Minecraft runtime emulator. It does not execute commands or evaluate arbitrary DeluxeMenus requirements.</p>
        </div>}
        {activeTool === 'compatibility' && <div className="tool-section">
          <div className="tool-intro"><ShieldCheck size={20}/><div><h3>Target environment</h3><p>Choose the Minecraft version you intend to run and review advisory warnings.</p></div></div>
          <label className="tool-field">Minecraft target version<select value={targetVersion} onChange={event => setTargetVersion(event.target.value)}><option>1.20.4</option><option>1.20.6</option><option>1.21.1</option><option>1.21.4</option><option>1.21.5</option><option>1.21.8</option><option>1.21.11</option><option>26.4 snapshot</option></select></label>
          <div className="compatibility-card"><b>Compatibility is advisory</b><p>DeluxeStudio checks for some newer item metadata fields. It cannot confirm plugin build support, server dependencies, or third-party placeholders automatically.</p></div>
          {getCompatibilityWarnings(config, targetVersion).length ? <div className="diagnostic-list">{getCompatibilityWarnings(config, targetVersion).map((warning, index) => <article className="diagnostic-item warning" key={index}><AlertTriangle size={16}/><section><b>Review required</b><p>{warning}</p></section></article>)}</div> : <div className="tool-empty compact"><CheckCircle2 size={20}/><b>No known metadata warnings for this target.</b></div>}
        </div>}
      </div>
    </section>
  </div>
}
