import React from 'react'
import ReactDOM from 'react-dom/client'
import MauxCRM from './MauxCRM'

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{fontFamily:'monospace',padding:32,background:'#fff',color:'#c00',minHeight:'100vh'}}>
          <h2 style={{marginBottom:12}}>⚠️ Runtime crash</h2>
          <pre style={{whiteSpace:'pre-wrap',fontSize:13,lineHeight:1.6,background:'#fef2f2',padding:16,borderRadius:8}}>
            {this.state.error?.message}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <MauxCRM />
  </ErrorBoundary>
)
