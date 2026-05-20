// ==================== GLOBAL VARIABLES ====================
let currentAnalysis = [];
let currentTool = 'home';
let currentImageData = null;
let currentExifResults = null;
let folderFiles = [];
let folderAnalysisResults = [];

// ==================== LOGGING ====================
// ==================== GLASS BUBBLY TOASTS ====================

let toastContainer = null;

function createToastContainer() {
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        document.body.appendChild(toastContainer);
    }
    return toastContainer;
}

function showToast(message, type) {
    const container = createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `glass-toast glass-${type}`;
    
    let icon = '💎';
    if (type === 'success') icon = '✓';
    else if (type === 'error') icon = '✕';
    else if (type === 'warning') icon = '⚠';
    
    toast.innerHTML = `
        <span class="glass-icon">${icon}</span>
        <span class="glass-message">${message}</span>
        <span class="glass-close">✕</span>
    `;
    
    container.appendChild(toast);
    
    // Close button
    const closeBtn = toast.querySelector('.glass-close');
    closeBtn.onclick = () => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 200);
    };
    
    // Auto remove after 2.5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 200);
        }
    }, 2500);
    
    // Max 4 toasts
    while (container.children.length > 4) {
        container.removeChild(container.firstChild);
    }
}

// MAIN addLog FUNCTION - REPLACE WITH THIS
function addLog(message, type = 'info') {
    // Show popup
    showToast(message, type);
    
    // Console panel
    const logsContainer = document.getElementById('logsContainer');
    if (!logsContainer) return;
    
    const logEntry = document.createElement('div');
    logEntry.className = `log-line ${type}`;
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    logEntry.innerHTML = `<span style="color: #64748b; margin-right: 8px;">[${timeStr}]</span> ● ${message}`;
    logsContainer.appendChild(logEntry);
    logsContainer.scrollTop = logsContainer.scrollHeight;
    
    while (logsContainer.children.length > 40) {
        logsContainer.removeChild(logsContainer.firstChild);
    }
}
// ==================== TOOL SWITCHING ====================
function switchTool(tool) {
    currentTool = tool;
    
    const navHome = document.getElementById('navHome');
    const navTyposquat = document.getElementById('navTyposquat');
    const navPassword = document.getElementById('navPassword');
    const navExif = document.getElementById('navExif');
    const navHistory = document.getElementById('navHistory');
    
    if (navHome) navHome.classList.toggle('active', tool === 'home');
    if (navTyposquat) navTyposquat.classList.toggle('active', tool === 'typosquat');
    if (navPassword) navPassword.classList.toggle('active', tool === 'password');
    if (navExif) navExif.classList.toggle('active', tool === 'exif');
    if (navHistory) navHistory.classList.toggle('active', tool === 'history');
    
    const typosquatSidebar = document.getElementById('typosquatSidebar');
    const passwordSidebar = document.getElementById('passwordSidebar');
    const exifSidebar = document.getElementById('exifSidebar');
    const historySidebar = document.getElementById('historySidebar');
    
    if (typosquatSidebar) typosquatSidebar.style.display = tool === 'typosquat' ? 'block' : 'none';
    if (passwordSidebar) passwordSidebar.style.display = tool === 'password' ? 'block' : 'none';
    if (exifSidebar) exifSidebar.style.display = tool === 'exif' ? 'block' : 'none';
    if (historySidebar) historySidebar.style.display = tool === 'history' ? 'block' : 'none';
    
    const homeResults = document.getElementById('homeResultsArea');
    const typosquatResults = document.getElementById('typosquatResultsArea');
    const passwordResults = document.getElementById('passwordResultsArea');
    const exifResultsArea = document.getElementById('exifResultsArea');
    const historyResultsArea = document.getElementById('historyResultsArea');
    
    if (homeResults) homeResults.style.display = tool === 'home' ? 'block' : 'none';
    if (typosquatResults) typosquatResults.style.display = tool === 'typosquat' ? 'block' : 'none';
    if (passwordResults) passwordResults.style.display = tool === 'password' ? 'block' : 'none';
    if (exifResultsArea) exifResultsArea.style.display = tool === 'exif' ? 'block' : 'none';
    if (historyResultsArea) historyResultsArea.style.display = tool === 'history' ? 'block' : 'none';
    
    const headerIcon = document.getElementById('activeToolIcon');
    const headerTitle = document.getElementById('activeToolTitle');
    const exportBtn = document.getElementById('exportReportBtn');
    
    if (tool === 'home') {
        if (headerIcon) headerIcon.textContent = '🏠';
        if (headerTitle) headerTitle.textContent = 'CYBER SECURITY DASHBOARD';
        if (exportBtn) exportBtn.style.display = 'none';
        addLog('Viewing Dashboard - Select a tool to begin', 'info');
    } else if (tool === 'typosquat') {
        if (headerIcon) headerIcon.textContent = '🎯';
        if (headerTitle) headerTitle.textContent = 'TYPOSQUAT ANALYSIS RESULTS';
        if (exportBtn) exportBtn.style.display = currentAnalysis.length > 0 ? 'flex' : 'none';
        addLog('Switched to Typosquat Detector', 'info');
    } else if (tool === 'password') {
        if (headerIcon) headerIcon.textContent = '🔐';
        if (headerTitle) headerTitle.textContent = 'PASSWORD ANALYSIS RESULTS';
        if (exportBtn) exportBtn.style.display = 'none';
        addLog('Switched to Password Analyzer', 'info');
    } else if (tool === 'exif') {
        if (headerIcon) headerIcon.textContent = '🖼️';
        if (headerTitle) headerTitle.textContent = 'EXIF GPS FORENSICS';
        if (exportBtn) exportBtn.style.display = 'none';
        addLog('Switched to EXIF GPS Forensics', 'info');
    } else if (tool === 'history') {
        if (headerIcon) headerIcon.textContent = '📋';
        if (headerTitle) headerTitle.textContent = 'ACTIVITY HISTORY';
        if (exportBtn) exportBtn.style.display = 'none';
        addLog('Viewing History - Your tool usage records', 'info');
        loadHistory();
    }
}

window.switchTool = switchTool;
// ==================== TYPOSQUAT FUNCTIONS (FIXED) ====================

function loadTyposquatSamples() {
    const urlInput = document.getElementById('urlInput');
    if (urlInput) {
        urlInput.value = `google.com\ngooogle.com\nfacebok.com\npaypa1.com\namaz0n.com\nmicr0soft.com\nfacebo0k.com`;
        addLog('✨ Sample domains loaded (7 examples)', 'success');
    }
}

function clearTyposquat() {
    const urlInput = document.getElementById('urlInput');
    const resultsArea = document.getElementById('typosquatResultsArea');
    if (urlInput) urlInput.value = '';
    if (resultsArea) {
        resultsArea.innerHTML = `<div class="empty-large"><div class="empty-large-icon">🔍</div>
        <div class="empty-large-text">No Analysis Performed</div>
        <div class="empty-large-sub">Enter domains and click START ANALYSIS</div></div>`;
    }
    currentAnalysis = [];
    updateTyposquatStats([]);
    const exportBtn = document.getElementById('exportReportBtn');
    if (exportBtn) exportBtn.style.display = 'none';
    addLog('🗑️ Cleared all typosquat results', 'info');
}

function updateTyposquatStats(results) {
    const total = results.length;
    const highRisk = results.filter(r => r.success && r.analysis?.risk_level === 'HIGH').length;
    const mediumRisk = results.filter(r => r.success && r.analysis?.risk_level === 'MEDIUM').length;
    const safe = results.filter(r => r.success && r.analysis?.risk_level === 'LOW').length;
    
    const totalEl = document.getElementById('totalCount');
    const highRiskEl = document.getElementById('highRiskCount');
    const safeEl = document.getElementById('safeCount');
    
    if (totalEl) totalEl.textContent = total;
    if (highRiskEl) highRiskEl.textContent = highRisk;
    if (safeEl) safeEl.textContent = safe;
    
    // Update or create medium risk element
    let mediumEl = document.getElementById('mediumRiskCount');
    if (!mediumEl) {
        const statsGrid = document.querySelector('#typosquatSidebar .stats-grid');
        if (statsGrid && statsGrid.children.length >= 3) {
            const newStat = document.createElement('div');
            newStat.className = 'stat-block';
            newStat.innerHTML = `<div class="stat-big-number medium-risk" id="mediumRiskCount" style="color: #f59e0b;">${mediumRisk}</div>
            <div class="stat-small-label">Medium Risk</div>`;
            statsGrid.appendChild(newStat);
        }
    } else {
        mediumEl.textContent = mediumRisk;
    }
}

function viewScreenshot(screenshotSrc) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    `;
    
    const img = document.createElement('img');
    img.src = screenshotSrc;
    img.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        border-radius: 12px;
        box-shadow: 0 0 40px rgba(0,0,0,0.5);
        cursor: default;
    `;
    
    const closeBtn = document.createElement('div');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = `
        position: absolute;
        top: 20px;
        right: 30px;
        color: white;
        font-size: 32px;
        cursor: pointer;
        background: rgba(0,0,0,0.5);
        width: 50px;
        height: 50px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    closeBtn.onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    
    modal.appendChild(img);
    modal.appendChild(closeBtn);
    document.body.appendChild(modal);
}

function displayTyposquatResults(results) {
    const resultsArea = document.getElementById('typosquatResultsArea');
    const exportBtn = document.getElementById('exportReportBtn');
    
    if (!resultsArea) return;
    
    if (!results || results.length === 0) {
        resultsArea.innerHTML = `<div class="empty-large"><div class="empty-large-icon">🔍</div>
        <div class="empty-large-text">No Analysis Performed</div>
        <div class="empty-large-sub">Enter domains and click START ANALYSIS</div></div>`;
        if (exportBtn && currentTool === 'typosquat') exportBtn.style.display = 'none';
        return;
    }
    
    let html = '';
    for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const cardNumber = (i + 1).toString().padStart(2, '0');
        
        // ERROR CASE
        if (!result.success) {
            const errorTitle = result.error || 'ANALYSIS ERROR';
            const errorReason = result.error_reason || 'Unable to analyze this domain';
            const errorSuggestion = result.error_suggestion || 'Please check the domain name and try again';
            const errorIcon = result.error_icon || '❌';
            
            html += `<div class="result-card" style="margin-bottom: 20px; border-left: 3px solid #dc2626;">
                <div class="result-header">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="font-size: 28px;">${errorIcon}</div>
                        <div>
                            <span class="result-url" style="font-size: 16px;">${escapeHtml(result.url)}</span>
                            <div style="font-size: 11px; color: #6b7280;">#${cardNumber}</div>
                        </div>
                    </div>
                    <span class="risk-badge risk-high">INVALID / ERROR</span>
                </div>
                <div class="result-content">
                    <div class="analysis-box" style="background: rgba(220,38,38,0.1);">
                        <p style="color: #dc2626; font-weight: 700; font-size: 14px;">${errorIcon} ${escapeHtml(errorTitle)}</p>
                        <p style="color: #f87171; margin-top: 8px;">📋 ${escapeHtml(errorReason)}</p>
                        <p style="color: #fbbf24; margin-top: 8px; font-size: 12px;">💡 Suggestion: ${escapeHtml(errorSuggestion)}</p>
                    </div>
                </div>
            </div>`;
            continue;
        }
        
        // SUCCESS CASE - YAHAN riskIcon DEFINED HAI
        const analysis = result.analysis;
        const typosquat = analysis.typosquatting;
        const riskClass = analysis.risk_level === 'HIGH' ? 'risk-high' : 
                         (analysis.risk_level === 'MEDIUM' ? 'risk-medium' : 'risk-low');
        
        // 🔴 RISK ICON DEFINITION 🔴
        let riskIcon = '🟢';
        if (analysis.risk_level === 'HIGH') riskIcon = '🔴';
        else if (analysis.risk_level === 'MEDIUM') riskIcon = '🟡';
        
        const statusText = typosquat.is_typosquat ? '⚠️ SUSPICIOUS' : '✅ LEGITIMATE';
        const statusClass = typosquat.is_typosquat ? 'risk-high' : 'risk-low';
        
        html += `<div class="result-card" style="margin-bottom: 24px; border-left: 4px solid ${analysis.risk_level === 'HIGH' ? '#dc2626' : (analysis.risk_level === 'MEDIUM' ? '#f59e0b' : '#10b981')};">
            <div class="result-header">
                <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="font-size: 32px;">🌐</div>
                        <div>
                            <span class="result-url" style="font-size: 18px; font-weight: 700;">${escapeHtml(result.url)}</span>
                            <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">
                                <span style="background: #1f2230; padding: 2px 8px; border-radius: 20px;">#${cardNumber}</span>
                                <span style="margin-left: 8px;">📁 Domain: ${escapeHtml(result.domain)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <span class="risk-badge ${riskClass}" style="font-size: 13px; padding: 6px 16px;">${riskIcon} ${analysis.risk_level} RISK (${analysis.risk_score}%)</span>
            </div>
            <div class="result-content">
                <div class="stats-grid" style="margin-bottom: 20px;">
                    <div class="stat-block">
                        <div class="stat-big-number">${typosquat.similarity_score}%</div>
                        <div class="stat-small-label">Similarity</div>
                    </div>
                    <div class="stat-block">
                        <div class="stat-big-number ${typosquat.is_typosquat ? 'high-risk' : 'safe'}">${statusText}</div>
                        <div class="stat-small-label">Status</div>
                    </div>
                    <div class="stat-block">
                        <div class="stat-big-number ${analysis.ssl.valid ? 'safe' : 'high-risk'}">${analysis.ssl.valid ? '✅ Valid' : '❌ Invalid'}</div>
                        <div class="stat-small-label">SSL Certificate</div>
                    </div>
                </div>
                
                <div class="analysis-section">
                    <div class="analysis-title">🎯 TYPOSQUATTING DETECTION</div>
                    <div class="analysis-box">
                        <p><strong>Domain:</strong> ${escapeHtml(result.domain)}</p>
                        <p><strong>Status:</strong> <span class="${statusClass}" style="padding: 2px 8px; border-radius: 20px;">${statusText}</span></p>
                        ${typosquat.matched_legitimate ? `<p><strong>🎭 Impersonates:</strong> <span style="color: #f59e0b;">${escapeHtml(typosquat.matched_legitimate)}</span></p>` : ''}
                        <p><strong>📊 Similarity Score:</strong> ${typosquat.similarity_score}%</p>
                        <p><strong>🔒 SSL:</strong> ${analysis.ssl.valid ? '✅ Valid certificate' : '❌ Invalid or missing certificate'}</p>
                        ${analysis.ssl.issuer ? `<p><strong>🏢 SSL Issuer:</strong> ${escapeHtml(analysis.ssl.issuer)}</p>` : ''}
                    </div>
                </div>`;
        
        if (typosquat.issues && typosquat.issues.length > 0) {
            html += `<div class="analysis-section">
                <div class="analysis-title">⚠️ SUSPICIOUS PATTERNS</div>
                <div class="analysis-box" style="border-color: #f59e0b;">
                    ${typosquat.issues.map(issue => `<p>🔍 ${escapeHtml(issue)}</p>`).join('')}
                </div>
            </div>`;
        }
        
        if (analysis.suspicious_elements && analysis.suspicious_elements.length > 0) {
            html += `<div class="analysis-section">
                <div class="analysis-title">🚨 SUSPICIOUS ELEMENTS DETECTED</div>
                <div class="analysis-box" style="border-color: #dc2626;">
                    ${analysis.suspicious_elements.map(el => `<p>⚠️ ${escapeHtml(el)}</p>`).join('')}
                </div>
            </div>`;
        }
        
        html += `<div class="analysis-section">
            <div class="analysis-title">📸 SCREENSHOT EVIDENCE</div>
            <div class="analysis-box" style="text-align: center; padding: 15px;">
                <img src="${result.screenshot}" 
                     style="max-width: 100%; max-height: 300px; border-radius: 12px; cursor: pointer; border: 1px solid #2d3748; transition: transform 0.2s;"
                     onclick="viewScreenshot('${result.screenshot}')"
                     onmouseenter="this.style.transform='scale(1.02)'"
                     onmouseleave="this.style.transform='scale(1)'">
                <p style="font-size: 11px; color: #6b7280; margin-top: 10px;">🖱️ Click image to enlarge</p>
            </div>
        </div>
        
        <div class="footer-note" style="margin-top: 16px; text-align: center; font-size: 11px;">
            🔍 Analysis completed at ${new Date().toLocaleTimeString()} | Evidence ID: TYP-${Date.now().toString().slice(-6)}
        </div>
            </div>
        </div>`;
    }
    resultsArea.innerHTML = html;
    if (exportBtn && currentTool === 'typosquat') exportBtn.style.display = 'flex';
}

async function startTyposquatAnalysis() {
    const urlInput = document.getElementById('urlInput');
    if (!urlInput) return;
    
    const urls = urlInput.value.split('\n').filter(u => u.trim());
    if (urls.length === 0) {
        addLog('❌ Please enter at least one domain to analyze', 'error');
        return;
    }
    
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '⏳ ANALYZING... PLEASE WAIT';
    }
    
    addLog(`🔍 Starting typosquat analysis for ${urls.length} domains...`, 'info');
    
    const resultsArea = document.getElementById('typosquatResultsArea');
    if (resultsArea) {
        resultsArea.innerHTML = `<div class="empty-large">
            <div class="empty-large-icon">⏳</div>
            <div class="empty-large-text">Analyzing Domains...</div>
            <div class="empty-large-sub">Please wait while we analyze ${urls.length} domain(s)</div>
            <div style="margin-top: 20px;"><div class="loading-spinner"></div></div>
        </div>`;
    }
    
    try {
        const response = await fetch('/analyze-typosquat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls: urls })
        });
        const data = await response.json();
        
        if (data.success) {
            currentAnalysis = data.results;
            displayTyposquatResults(data.results);
            updateTyposquatStats(data.results);
            const highRiskCount = data.results.filter(r => r.success && r.analysis?.risk_level === 'HIGH').length;
            addLog(`✅ Analysis complete! ${data.analyzed}/${data.total} domains analyzed | ${highRiskCount} high risk found`, 'success');
        } else {
            addLog(`❌ Analysis failed: ${data.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        addLog(`❌ Error: ${error.message}`, 'error');
        if (resultsArea) {
            resultsArea.innerHTML = `<div class="empty-large">
                <div class="empty-large-icon">❌</div>
                <div class="empty-large-text">Analysis Failed</div>
                <div class="empty-large-sub">${error.message}</div>
            </div>`;
        }
    } finally {
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '🔍 START ANALYSIS';
        }
    }
}

// Loading spinner CSS
const spinnerStyle = document.createElement('style');
spinnerStyle.textContent = `
    .loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgba(0, 245, 255, 0.2);
        border-top: 3px solid #00f5ff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto;
    }
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
if (!document.querySelector('#spinner-style')) {
    spinnerStyle.id = 'spinner-style';
    document.head.appendChild(spinnerStyle);
}

// ==================== TYPOSQUAT EXPORT FUNCTION ====================

function generateTyposquatReport() {
    console.log("generateTyposquatReport called");
    
    if (!currentAnalysis || currentAnalysis.length === 0) {
        addLog('❌ No typosquat analysis to export', 'error');
        return;
    }
    
    addLog('📄 Generating typosquat report with screenshots...', 'info');
    
    const timestamp = new Date().toLocaleString();
    const totalDomains = currentAnalysis.length;
    const highRisk = currentAnalysis.filter(r => r.success && r.analysis?.risk_level === 'HIGH').length;
    const mediumRisk = currentAnalysis.filter(r => r.success && r.analysis?.risk_level === 'MEDIUM').length;
    const lowRisk = currentAnalysis.filter(r => r.success && r.analysis?.risk_level === 'LOW').length;
    const failed = currentAnalysis.filter(r => !r.success).length;
    
    let reportHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Typosquat Analysis Report - ${timestamp}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #f0f2f5;
            padding: 40px 24px;
            color: #1e293b;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 24px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .report-header {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: white;
            padding: 32px 40px;
            border-bottom: 4px solid #38bdf8;
        }
        
        .report-header h1 {
            font-size: 28px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .report-header h1 span {
            font-size: 36px;
        }
        
        .report-header .subtitle {
            color: #94a3b8;
            font-size: 14px;
            margin-top: 8px;
        }
        
        .report-meta {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
            padding-top: 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            font-size: 13px;
            color: #cbd5e1;
            flex-wrap: wrap;
            gap: 10px;
        }
        
        .summary-section {
            padding: 28px 40px;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .summary-title {
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
            border-left: 4px solid #38bdf8;
            padding-left: 16px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 20px;
        }
        
        .stat-card {
            background: white;
            border-radius: 16px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
        }
        
        .stat-number {
            font-size: 38px;
            font-weight: 800;
            color: #0f172a;
        }
        
        .stat-number.high-risk { color: #dc2626; }
        .stat-number.medium-risk { color: #d97706; }
        .stat-number.low-risk { color: #059669; }
        
        .stat-label {
            font-size: 12px;
            color: #64748b;
            margin-top: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 600;
        }
        
        .report-card {
            margin: 28px 40px;
            background: white;
            border-radius: 20px;
            border: 1px solid #e2e8f0;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            page-break-inside: avoid;
            break-inside: avoid;
        }
        
        .card-header {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            padding: 18px 28px;
            border-bottom: 2px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 16px;
        }
        
        .domain-info {
            display: flex;
            align-items: center;
            gap: 14px;
        }
        
        .domain-icon {
            font-size: 36px;
            background: #e2e8f0;
            width: 52px;
            height: 52px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 16px;
        }
        
        .domain-url {
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
        }
        
        .card-number {
            background: #cbd5e1;
            padding: 4px 12px;
            border-radius: 30px;
            font-size: 11px;
            font-weight: 700;
            color: #475569;
            margin-left: 10px;
        }
        
        .domain-name-small {
            font-size: 13px;
            color: #64748b;
            margin-top: 4px;
        }
        
        .risk-badge {
            padding: 8px 20px;
            border-radius: 40px;
            font-size: 13px;
            font-weight: 700;
        }
        
        .risk-high { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
        .risk-medium { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
        .risk-low { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
        
        .card-body {
            padding: 28px;
        }
        
        .info-section {
            margin-bottom: 24px;
        }
        
        .section-title {
            font-size: 14px;
            font-weight: 800;
            color: #334155;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 14px;
            border-left: 3px solid #38bdf8;
            padding-left: 12px;
        }
        
        .info-grid {
            background: #f8fafc;
            border-radius: 14px;
            padding: 18px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 14px;
        }
        
        .info-item {
            display: flex;
            flex-direction: column;
        }
        
        .info-label {
            font-size: 11px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        
        .info-value {
            font-size: 14px;
            font-weight: 600;
            color: #0f172a;
        }
        
        .info-value.suspicious { color: #dc2626; }
        .info-value.legitimate { color: #059669; }
        
        .issues-list {
            background: #f8fafc;
            border-radius: 14px;
            padding: 18px;
        }
        
        .issue-item {
            padding: 8px 0;
            border-left: 2px solid #f59e0b;
            padding-left: 12px;
            margin: 6px 0;
            font-size: 13px;
        }
        
        .screenshot-section {
            margin-top: 20px;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
        }
        
        .screenshot-title {
            font-size: 13px;
            font-weight: 700;
            color: #334155;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .screenshot-img {
            width: 100%;
            max-height: 400px;
            object-fit: contain;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            background: #f8fafc;
        }
        
        .screenshot-note {
            font-size: 11px;
            color: #94a3b8;
            text-align: center;
            margin-top: 10px;
        }
        
        .evidence-id {
            font-size: 10px;
            color: #94a3b8;
            text-align: center;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid #e2e8f0;
        }
        
        .footer {
            background: #f8fafc;
            padding: 24px 40px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            font-size: 12px;
            color: #64748b;
        }
        
        hr {
            border: none;
            border-top: 1px solid #e2e8f0;
            margin: 20px 0;
        }
        
        @media print {
            body { background: white; padding: 0; }
            .container { box-shadow: none; }
            .report-card { break-inside: avoid; page-break-inside: avoid; }
        }
        
        @media (max-width: 768px) {
            body { padding: 20px 12px; }
            .card-header { flex-direction: column; align-items: flex-start; }
            .domain-icon { width: 42px; height: 42px; font-size: 28px; }
            .domain-url { font-size: 16px; }
        }
    </style>
</head>
<body>
<div class="container">
    <div class="report-header">
        <h1><span>🎯</span> TYPOSQUAT DETECTOR REPORT</h1>
        <div class="subtitle">Professional Domain Typosquatting Analysis | Court-Admissible Format</div>
        <div class="report-meta">
            <span>📅 Generated: ${timestamp}</span>
            <span>🔬 Tool: Cyber Security Toolkit Pro</span>
            <span>🔒 Case ID: TYP-${Date.now().toString().slice(-8)}</span>
        </div>
    </div>
    
    <div class="summary-section">
        <div class="summary-title">📊 EXECUTIVE SUMMARY</div>
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-number">${totalDomains}</div><div class="stat-label">Total Domains</div></div>
            <div class="stat-card"><div class="stat-number high-risk">${highRisk}</div><div class="stat-label">🔴 HIGH RISK</div></div>
            <div class="stat-card"><div class="stat-number medium-risk">${mediumRisk}</div><div class="stat-label">🟡 MEDIUM RISK</div></div>
            <div class="stat-card"><div class="stat-number low-risk">${lowRisk}</div><div class="stat-label">🟢 LOW RISK</div></div>
            ${failed > 0 ? `<div class="stat-card"><div class="stat-number">${failed}</div><div class="stat-label">❌ FAILED</div></div>` : ''}
        </div>
    </div>`;
    
    // Individual Reports with Screenshots
    for (let i = 0; i < currentAnalysis.length; i++) {
        const result = currentAnalysis[i];
        const cardNumber = (i + 1).toString().padStart(2, '0');
        
        if (!result.success) {
            reportHtml += `
            <div class="report-card">
                <div class="card-header">
                    <div class="domain-info">
                        <div class="domain-icon">❌</div>
                        <div>
                            <div class="domain-url">${escapeHtml(result.url)}<span class="card-number">#${cardNumber}</span></div>
                            <div class="domain-name-small">Analysis Failed</div>
                        </div>
                    </div>
                    <div class="risk-badge risk-high">ERROR</div>
                </div>
                <div class="card-body">
                    <div class="info-section">
                        <div class="section-title">⚠️ ERROR DETAILS</div>
                        <div class="info-grid">
                            <div class="info-item">
                                <div class="info-label">Error Message</div>
                                <div class="info-value">${escapeHtml(result.error || 'Unknown error')}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
            continue;
        }
        
        const analysis = result.analysis;
        const typosquat = analysis.typosquatting;
        const riskClass = analysis.risk_level === 'HIGH' ? 'risk-high' : (analysis.risk_level === 'MEDIUM' ? 'risk-medium' : 'risk-low');
        
        let riskIcon = '🟢';
        if (analysis.risk_level === 'HIGH') riskIcon = '🔴';
        else if (analysis.risk_level === 'MEDIUM') riskIcon = '🟡';
        
        const statusText = typosquat.is_typosquat ? '⚠️ SUSPICIOUS' : '✅ LEGITIMATE';
        const statusClass = typosquat.is_typosquat ? 'suspicious' : 'legitimate';
        
        // Get screenshot data - IMPORTANT: result.screenshot already has base64 data
        const screenshotSrc = result.screenshot || '';
        
        reportHtml += `
        <div class="report-card">
            <div class="card-header">
                <div class="domain-info">
                    <div class="domain-icon">🌐</div>
                    <div>
                        <div class="domain-url">${escapeHtml(result.url)}<span class="card-number">#${cardNumber}</span></div>
                        <div class="domain-name-small">📁 ${escapeHtml(result.domain)}</div>
                    </div>
                </div>
                <div class="risk-badge ${riskClass}">${riskIcon} ${analysis.risk_level} RISK (${analysis.risk_score}%)</div>
            </div>
            <div class="card-body">
                <div class="info-section">
                    <div class="section-title">🎯 TYPOSQUATTING DETECTION</div>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Status</div>
                            <div class="info-value ${statusClass}">${statusText}</div>
                        </div>
                        ${typosquat.matched_legitimate ? `
                        <div class="info-item">
                            <div class="info-label">Impersonates</div>
                            <div class="info-value">🎭 ${escapeHtml(typosquat.matched_legitimate)}</div>
                        </div>` : ''}
                        <div class="info-item">
                            <div class="info-label">Similarity Score</div>
                            <div class="info-value">${typosquat.similarity_score}%</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">SSL Certificate</div>
                            <div class="info-value ${analysis.ssl.valid ? 'legitimate' : 'suspicious'}">
                                ${analysis.ssl.valid ? '✅ Valid' : '❌ Invalid'}
                            </div>
                        </div>
                        ${analysis.ssl.issuer ? `
                        <div class="info-item">
                            <div class="info-label">SSL Issuer</div>
                            <div class="info-value">🏢 ${escapeHtml(analysis.ssl.issuer)}</div>
                        </div>` : ''}
                    </div>
                </div>`;
        
        if (typosquat.issues && typosquat.issues.length > 0) {
            reportHtml += `
                <div class="info-section">
                    <div class="section-title">⚠️ SUSPICIOUS PATTERNS</div>
                    <div class="issues-list">
                        ${typosquat.issues.map(issue => `<div class="issue-item">🔍 ${escapeHtml(issue)}</div>`).join('')}
                    </div>
                </div>`;
        }
        
        if (analysis.suspicious_elements && analysis.suspicious_elements.length > 0) {
            reportHtml += `
                <div class="info-section">
                    <div class="section-title">🚨 SUSPICIOUS ELEMENTS</div>
                    <div class="issues-list">
                        ${analysis.suspicious_elements.map(el => `<div class="issue-item">⚠️ ${escapeHtml(el)}</div>`).join('')}
                    </div>
                </div>`;
        }
        
        // SCREENSHOT SECTION - IMPORTANT FIX
        reportHtml += `
                <div class="screenshot-section">
                    <div class="screenshot-title">
                        <span>📸</span> WEBSITE SCREENSHOT EVIDENCE
                    </div>`;
        
        if (screenshotSrc && screenshotSrc.startsWith('data:image')) {
            reportHtml += `
                    <img src="${screenshotSrc}" class="screenshot-img" alt="Screenshot of ${escapeHtml(result.url)}">
                    <div class="screenshot-note">
                        🖱️ Screenshot captured at analysis time | Evidence of website appearance
                    </div>`;
        } else {
            reportHtml += `
                    <div style="background: #f8fafc; border-radius: 12px; padding: 40px; text-align: center; border: 1px dashed #cbd5e1;">
                        <span style="font-size: 48px;">📷</span>
                        <p style="margin-top: 10px; color: #64748b;">Screenshot not available for this domain</p>
                        <p style="font-size: 11px; color: #94a3b8;">The website may be inaccessible or screenshot capture failed</p>
                    </div>`;
        }
        
        reportHtml += `
                </div>
                
                <div class="evidence-id">
                    🔑 Evidence ID: TYP-${Date.now().toString().slice(-6)}-${(i+1).toString().padStart(3, '0')}
                    | Analyzed: ${new Date().toLocaleString()}
                </div>
            </div>
        </div>`;
    }
    
    reportHtml += `
        <div class="footer">
            <p><strong>🔒 Cyber Security Toolkit Pro</strong> | Professional Typosquat Detection Suite</p>
            <p>This report contains automated analysis of domains for typosquatting detection.</p>
            <p style="margin-top: 10px; font-size: 10px; color: #94a3b8;">
                ⚖️ Court-Admissible Report | Generated by automated forensic tool
            </p>
        </div>
    </div>
</body>
</html>`;
    
    const blob = new Blob([reportHtml], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `typosquat_report_${Date.now()}.html`;
    link.click();
    addLog('✅ Typosquat report exported with screenshots!', 'success');
}

// Helper function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
// ==================== PASSWORD FUNCTIONS ====================
async function analyzePassword() {
    console.log("analyzePassword called!"); // Debug
    const passwordInput = document.getElementById('passwordInput');
    if (!passwordInput) {
        console.log("passwordInput not found!");
        return;
    }
    const password = passwordInput.value;
    if (!password) {
        addLog('Please enter a password', 'error');
        return;
    }
    
    const analyzeBtn = document.getElementById('analyzePasswordBtn');
    if (analyzeBtn) {
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '⏳ ANALYZING...';
    }
    addLog('Analyzing password...', 'info');
    
    try {
        const response = await fetch('/analyze-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: password })
        });
        const data = await response.json();
        console.log("Password API response:", data);
        if (data.success) {
            displayPasswordResults(data.report);
            updatePasswordStats(data.report);
            addLog(`✓ Password strength: ${data.report.strength_label}`, 'success');
        } else {
            addLog(`Error: ${data.error || 'Analysis failed'}`, 'error');
        }
    } catch (error) {
        addLog(`Error: ${error.message}`, 'error');
        console.error("Password API error:", error);
    } finally {
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '🔍 ANALYZE PASSWORD';
        }
    }
}

function displayPasswordResults(report) {
    const container = document.getElementById('passwordResultsArea');
    if (!container) return;
    
    let issuesHtml = '';
    for (const issue of report.issues.slice(0, 8)) {
        let icon = '⚠️';
        if (issue.includes('✅')) icon = '✅';
        else if (issue.includes('❌')) icon = '❌';
        issuesHtml += `<div class="issue-item">${icon} ${issue}</div>`;
    }
    
    let suggestionsHtml = '';
    for (const suggestion of report.suggestions.slice(0, 4)) {
        suggestionsHtml += `<div class="suggestion-item">💡 ${suggestion}</div>`;
    }
    
    let crackHtml = '';
    const crackEntries = Object.entries(report.crack_times);
    for (let i = 0; i < crackEntries.length; i++) {
        const [scenario, time] = crackEntries[i];
        let icon = '🖥️';
        if (scenario.includes('Online')) icon = '🌐';
        else if (scenario.includes('Offline')) icon = '💻';
        else if (scenario.includes('GPU')) icon = '⚡';
        else if (scenario.includes('Nation')) icon = '🏛️';
        crackHtml += `<div class="crack-item">
            <div class="crack-label">${icon} ${scenario}</div>
            <div class="crack-value">${time}</div>
        </div>`;
    }
    
    const scorePercent = (report.score / 10) * 100;
    let scoreColor = '#ef4444';
    if (report.score >= 8) {
        scoreColor = '#10b981';
    } else if (report.score >= 6) {
        scoreColor = '#f59e0b';
    } else if (report.score >= 4) {
        scoreColor = '#f97316';
    }
    
    let strengthBadgeClass = '';
    let strengthIcon = '';
    if (report.strength_label.includes('VERY STRONG')) {
        strengthBadgeClass = 'risk-low';
        strengthIcon = '🛡️';
    } else if (report.strength_label.includes('STRONG')) {
        strengthBadgeClass = 'risk-low';
        strengthIcon = '💪';
    } else if (report.strength_label.includes('MODERATE')) {
        strengthBadgeClass = 'risk-medium';
        strengthIcon = '⚠️';
    } else {
        strengthBadgeClass = 'risk-high';
        strengthIcon = '❌';
    }
    
    container.innerHTML = `
        <div class="result-card">
            <div class="result-header">
                <span class="result-url">🔐 Password Analysis Report</span>
                <span class="risk-badge ${strengthBadgeClass}">${strengthIcon} ${report.strength_label}</span>
            </div>
            <div class="result-content">
                <div class="password-score-card">
                    <div class="score-bar-container">
                        <div class="score-label">🔬 Strength Score: ${report.score}/10</div>
                        <div class="score-bar">
                            <div class="score-fill" style="width: ${scorePercent}%; background: ${scoreColor};"></div>
                        </div>
                    </div>
                </div>
                
                <div class="stats-grid" style="margin-bottom: 24px;">
                    <div class="stat-block">
                        <div class="stat-big-number">${report.entropy}</div>
                        <div class="stat-small-label">Entropy (bits)</div>
                    </div>
                    <div class="stat-block">
                        <div class="stat-big-number">${report.length}</div>
                        <div class="stat-small-label">Length</div>
                    </div>
                    <div class="stat-block">
                        <div class="stat-big-number">${report.charset_size}</div>
                        <div class="stat-small-label">Charset Size</div>
                    </div>
                    <div class="stat-block">
                        <div class="stat-big-number ${report.breach_count > 0 ? 'high-risk' : 'safe'}">
                            ${report.breach_count > 0 ? `🚨 ${report.breach_count}` : '✅ Clean'}
                        </div>
                        <div class="stat-small-label">Breach Status</div>
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-title">📊 Password Composition</div>
                    <div class="composition-grid">
                        <div class="comp-item">🔡 Lowercase: ${report.composition.lowercase}</div>
                        <div class="comp-item">🔠 Uppercase: ${report.composition.uppercase}</div>
                        <div class="comp-item">🔢 Digits: ${report.composition.digits}</div>
                        <div class="comp-item">✨ Symbols: ${report.composition.symbols}</div>
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-title">⏱️ Estimated Crack Time</div>
                    <div class="crack-grid">${crackHtml}</div>
                </div>
                
                <div class="section">
                    <div class="section-title">⚠️ Security Issues</div>
                    <div class="issues-list">${issuesHtml || '<div class="success-item">✅ No major security issues found!</div>'}</div>
                </div>
                
                <div class="section">
                    <div class="section-title">💡 Stronger Password Suggestions</div>
                    <div class="suggestions-list">${suggestionsHtml}</div>
                </div>
                
                <div class="footer-note">
                    🔒 Analysis completed in ${report.analysis_time_ms}ms
                </div>
            </div>
        </div>
    `;
}

function updatePasswordStats(report) {
    const strengthEl = document.getElementById('pwdStrength');
    const entropyEl = document.getElementById('pwdEntropy');
    const lengthEl = document.getElementById('pwdLength');
    const breachEl = document.getElementById('pwdBreach');
    if (strengthEl) strengthEl.textContent = report.strength_label.split(' ')[0];
    if (entropyEl) entropyEl.textContent = report.entropy;
    if (lengthEl) lengthEl.textContent = report.length;
    if (breachEl) breachEl.textContent = report.breach_count > 0 ? `🚨 ${report.breach_count}` : '✅ Clean';
}

function loadPasswordSample() {
    const passwordInput = document.getElementById('passwordInput');
    if (passwordInput) {
        passwordInput.value = 'MySecureP@ssw0rd!!';
        addLog('Sample password loaded', 'info');
        analyzePassword();
    }
}

function clearPassword() {
    const passwordInput = document.getElementById('passwordInput');
    const resultsArea = document.getElementById('passwordResultsArea');
    if (passwordInput) passwordInput.value = '';
    if (resultsArea) {
        resultsArea.innerHTML = `<div class="empty-large"><div class="empty-large-icon">🔐</div>
        <div class="empty-large-text">No Password Analyzed</div>
        <div class="empty-large-sub">Enter a password and click ANALYZE PASSWORD</div></div>`;
    }
    const strengthEl = document.getElementById('pwdStrength');
    const entropyEl = document.getElementById('pwdEntropy');
    const lengthEl = document.getElementById('pwdLength');
    const breachEl = document.getElementById('pwdBreach');
    if (strengthEl) strengthEl.textContent = '—';
    if (entropyEl) entropyEl.textContent = '—';
    if (lengthEl) lengthEl.textContent = '—';
    if (breachEl) breachEl.textContent = '—';
    addLog('Cleared password results', 'info');
}

// ==================== EXIF FUNCTIONS ====================
// ==================== EXIF FUNCTIONS (UPDATED - Typosquat Style) ====================

let currentExifResult = null;
let currentExifResultsList = [];

function setupExifUpload() {
    const fileInput = document.getElementById('exifFileInput');
    const previewDiv = document.getElementById('exifImagePreview');
    const previewImg = document.getElementById('exifPreviewImg');
    
    if (!fileInput) return;
    
    fileInput.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = function(loadEvent) {
                currentImageData = loadEvent.target.result;
                if (previewImg) previewImg.src = loadEvent.target.result;
                if (previewDiv) previewDiv.style.display = 'block';
                addLog(`Image loaded: ${file.name} (${(file.size/1024).toFixed(1)} KB)`, 'success');
            };
            reader.readAsDataURL(file);
        }
    });
}

function setupFolderUpload() {
    const folderInput = document.getElementById('folderFileInput');
    
    if (folderInput) {
        folderInput.addEventListener('change', function(e) {
            const files = Array.from(e.target.files);
            folderFiles = files.filter(f => f.type.startsWith('image/'));
            addLog(`📁 Selected folder contains ${folderFiles.length} images`, 'info');
        });
    }
}

async function analyzeSingleImage() {
    console.log("analyzeSingleImage called!");
    if (!currentImageData) {
        addLog('Please select an image first', 'error');
        return;
    }
    
    const analyzeBtn = document.getElementById('analyzeExifBtn');
    if (analyzeBtn) {
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '⏳ ANALYZING...';
    }
    
    addLog('Analyzing image EXIF data...', 'info');
    
    try {
        const response = await fetch('/analyze-exif', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: currentImageData, filename: 'uploaded_image.jpg' })
        });
        const data = await response.json();
        console.log("EXIF API response:", data);
        
        if (data.success && data.result && !data.result.error) {
            currentExifResult = data.result;
            currentExifResultsList = [data.result];
            displayExifResultTyposquatStyle(data.result);
            document.getElementById('exifExportBtns').style.display = 'flex';
            addLog('✓ EXIF analysis complete!', 'success');
        } else {
            addLog(`Error: ${data.result?.error || 'Analysis failed'}`, 'error');
        }
    } catch (error) {
        addLog(`Error: ${error.message}`, 'error');
        console.error("EXIF API error:", error);
    } finally {
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '🔍 ANALYZE IMAGE';
        }
    }
}

async function analyzeFolder() {
    if (folderFiles.length === 0) {
        addLog('Please select a folder first', 'error');
        return;
    }
    
    const progressDiv = document.getElementById('analysisProgress');
    const progressFill = document.getElementById('analysisProgressFill');
    const progressText = document.getElementById('analysisProgressText');
    const analyzeBtn = document.getElementById('analyzeFolderBtn');
    
    if (progressDiv) progressDiv.style.display = 'block';
    if (analyzeBtn) analyzeBtn.disabled = true;
    
    folderAnalysisResults = [];
    currentExifResultsList = [];
    let gpsPoints = [];
    
    addLog(`Starting folder analysis of ${folderFiles.length} images...`, 'info');
    
    for (let i = 0; i < folderFiles.length; i++) {
        const file = folderFiles[i];
        
        if (progressFill) progressFill.style.width = `${((i + 1) / folderFiles.length) * 100}%`;
        if (progressText) progressText.textContent = `Analyzing ${i+1}/${folderFiles.length}: ${file.name}`;
        
        const reader = new FileReader();
        const imageData = await new Promise((resolve) => {
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
        
        try {
            const response = await fetch('/analyze-exif', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imageData, filename: file.name })
            });
            const data = await response.json();
            
            if (data.success && data.result && !data.result.error) {
                const result = data.result;
                result.file = file.name;
                folderAnalysisResults.push(result);
                currentExifResultsList.push(result);
                
                if (result.gps_info && result.gps_info.lat) {
                    gpsPoints.push({
                        file: file.name,
                        lat: result.gps_info.lat,
                        lon: result.gps_info.lon,
                        address: result.location_details?.address || `${result.gps_info.lat}, ${result.gps_info.lon}`
                    });
                }
                
                addLog(`✓ Analyzed: ${file.name}`, 'success');
            } else {
                addLog(`✗ Failed: ${file.name}`, 'error');
                folderAnalysisResults.push({ file: file.name, error: data.result?.error || 'Analysis failed', success: false });
            }
        } catch (error) {
            addLog(`Error: ${file.name}`, 'error');
            folderAnalysisResults.push({ file: file.name, error: error.message, success: false });
        }
    }
    
    if (progressDiv) progressDiv.style.display = 'none';
    if (analyzeBtn) analyzeBtn.disabled = false;
    
    displayFolderResultsTyposquatStyle(folderAnalysisResults, gpsPoints);
    document.getElementById('exifExportBtns').style.display = 'flex';
    addLog(`✓ Folder analysis complete! ${folderAnalysisResults.filter(r => r.success !== false).length}/${folderFiles.length} images analyzed`, 'success');
}

function displayExifResultTyposquatStyle(result) {
    const container = document.getElementById('exifResultsArea');
    if (!container) return;
    
    // Determine risk level based on GPS and AI
    let riskLevel = 'LOW';
    let riskScore = 0;
    let riskIcon = '✅';
    
    if (result.gps_info && result.gps_info.lat) {
        riskScore += 60;
        riskLevel = 'HIGH';
        riskIcon = '📍';
    }
    if (result.ai_generation_detection && result.ai_generation_detection.is_ai_generated) {
        riskScore += 40;
        if (riskLevel !== 'HIGH') riskLevel = 'MEDIUM';
        riskIcon = '🤖';
    }
    if (result.manipulation_detection && result.manipulation_detection.is_edited) {
        riskScore += 30;
        if (riskLevel !== 'HIGH') riskLevel = 'MEDIUM';
    }
    if (riskScore === 0) {
        riskIcon = '✅';
    }
    
    const riskClass = riskLevel === 'HIGH' ? 'risk-high' : (riskLevel === 'MEDIUM' ? 'risk-medium' : 'risk-low');
    
    // Get timestamp - IMPROVED: show actual datetime
    let timestampHtml = '<div class="analysis-section"><div class="analysis-title">⏰ IMAGE TIMESTAMP</div><div class="analysis-box" style="border-color: #00d4ff;">';
    
    if (result.temporal_info) {
        const taken = result.temporal_info.datetime_taken || 'Not found';
        const original = result.temporal_info.datetime_original || 'Not found';
        const modified = result.temporal_info.datetime_modified || 'Not found';
        const source = result.temporal_info.source || 'EXIF Metadata';
        
        timestampHtml += `
            <p><strong>📅 Date Taken:</strong> <span style="color: #39ff9f; font-weight: bold;">${taken}</span></p>
            ${original !== 'Not found' && original !== taken ? `<p><strong>📷 Date Original:</strong> ${original}</p>` : ''}
            <p><strong>🕒 Last Modified:</strong> ${modified}</p>
            <p><strong>🔍 Source:</strong> ${source}</p>
        `;
        
        if (result.temporal_info.time_mismatch) {
            timestampHtml += `<p><strong>⚠️ WARNING:</strong> Time mismatch detected between capture and file modification!</p>`;
        }
    } else {
        timestampHtml += `<p>No timestamp information available</p>`;
    }
    timestampHtml += '</div></div>';
    
    // GPS HTML
    let gpsHtml = '';
    if (result.gps_info && result.gps_info.lat) {
        gpsHtml = `<div class="analysis-section"><div class="analysis-title">📍 GPS LOCATION</div>
        <div class="analysis-box" style="border-color: #ff3b5c;">
        <p><strong>Latitude:</strong> <span style="color: #00f5ff;">${result.gps_info.lat}</span></p>
        <p><strong>Longitude:</strong> <span style="color: #00f5ff;">${result.gps_info.lon}</span></p>
        ${result.gps_info.alt ? `<p><strong>Altitude:</strong> ${result.gps_info.alt}m</p>` : ''}
        ${result.location_details?.address ? `<p><strong>📍 Exact Address:</strong> ${result.location_details.address}</p>` : ''}
        <p><a href="https://www.google.com/maps?q=${result.gps_info.lat},${result.gps_info.lon}" target="_blank" style="color: #00f5ff;">🗺️ Open in Google Maps →</a></p>
        </div></div>`;
    }
    
    // AI Detection HTML
    let aiHtml = '';
    if (result.ai_generation_detection && result.ai_generation_detection.is_ai_generated) {
        aiHtml = `<div class="analysis-section"><div class="analysis-title">🤖 AI GENERATION DETECTION</div>
        <div class="analysis-box" style="border-color: #ffb830;">
        <p><strong>Status:</strong> <span style="color: #ffb830;">⚠️ AI GENERATED IMAGE</span></p>
        <p><strong>AI Tool:</strong> ${result.ai_generation_detection.ai_tool || 'Unknown'}</p>
        <p><strong>Confidence:</strong> ${result.ai_generation_detection.confidence}</p>
        <p><strong>Description:</strong> ${result.ai_generation_detection.description || 'AI generated content detected'}</p>
        </div></div>`;
    }
    
    // Steganography HTML
    let stegoHtml = '';
    if (result.steganography_detection && result.steganography_detection.has_hidden_data) {
        stegoHtml = `<div class="analysis-section"><div class="analysis-title">🕵️ STEGANOGRAPHY DETECTION</div>
        <div class="analysis-box" style="border-color: #ff3b5c;">
        <p><strong>Hidden Data:</strong> <span style="color: #ff3b5c;">⚠️ FOUND</span></p>
        <p><strong>Method:</strong> ${result.steganography_detection.method || 'LSB Steganography'}</p>
        <p><strong>Message:</strong> ${result.steganography_detection.hidden_message?.substring(0, 100) || 'Hidden data detected'}</p>
        </div></div>`;
    }
    
    // Forensic Indicators
    let indicatorsHtml = '';
    if (result.forensic_indicators && result.forensic_indicators.length > 0) {
        indicatorsHtml = `<div class="analysis-section"><div class="analysis-title">🔬 FORENSIC INDICATORS</div>
        <div class="analysis-box">`;
        for (const indicator of result.forensic_indicators) {
            indicatorsHtml += `<p>${indicator}</p>`;
        }
        indicatorsHtml += `</div></div>`;
    }
    
    const html = `
        <div class="result-card">
            <div class="result-header">
                <span class="result-url">📷 ${result.file || 'Image Analysis'}</span>
                <span class="risk-badge ${riskClass}">${riskIcon} ${riskLevel} RISK</span>
            </div>
            <div class="result-content">
                <!-- Stats Row -->
                <div class="stats-grid" style="margin-bottom: 24px;">
                    <div class="stat-block">
                        <div class="stat-big-number">${result.basic_info?.width || '?'}</div>
                        <div class="stat-small-label">Width (px)</div>
                    </div>
                    <div class="stat-block">
                        <div class="stat-big-number">${result.basic_info?.height || '?'}</div>
                        <div class="stat-small-label">Height (px)</div>
                    </div>
                    <div class="stat-block">
                        <div class="stat-big-number">${result.basic_info?.size_kb || '?'}</div>
                        <div class="stat-small-label">Size (KB)</div>
                    </div>
                    <div class="stat-block">
                        <div class="stat-big-number">${result.basic_info?.format || '?'}</div>
                        <div class="stat-small-label">Format</div>
                    </div>
                </div>
                
                <!-- TIMESTAMP SECTION - HIGHLIGHTED -->
                ${timestampHtml}
                
                <!-- Camera Info -->
                <div class="analysis-section">
                    <div class="analysis-title">📷 CAMERA INFORMATION</div>
                    <div class="analysis-box">
                        <p><strong>Make:</strong> ${result.camera_info?.make || 'Unknown'}</p>
                        <p><strong>Model:</strong> ${result.camera_info?.model || 'Unknown'}</p>
                        <p><strong>Software:</strong> ${result.camera_info?.software || 'Unknown'}</p>
                        ${result.camera_info?.lens && result.camera_info.lens !== 'Unknown' ? `<p><strong>Lens:</strong> ${result.camera_info.lens}</p>` : ''}
                    </div>
                </div>
                
                <!-- Camera Settings -->
                <div class="analysis-section">
                    <div class="analysis-title">⚙️ CAMERA SETTINGS</div>
                    <div class="analysis-box">
                        <div class="composition-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                            <div class="comp-item">🎯 ISO: ${result.camera_settings?.iso || 'N/A'}</div>
                            <div class="comp-item">📷 Aperture: f/${result.camera_settings?.f_number || 'N/A'}</div>
                            <div class="comp-item">⏱️ Shutter: ${result.camera_settings?.exposure_time || 'N/A'}</div>
                            <div class="comp-item">🔭 Focal Length: ${result.camera_settings?.focal_length || 'N/A'}mm</div>
                            <div class="comp-item">⚡ Flash: ${result.camera_settings?.flash || 'N/A'}</div>
                            <div class="comp-item">🎨 White Balance: ${result.camera_settings?.white_balance || 'N/A'}</div>
                        </div>
                    </div>
                </div>
                
                ${gpsHtml}
                ${aiHtml}
                ${stegoHtml}
                ${indicatorsHtml}
                
                <!-- Social Media Origin -->
                ${result.social_media_origin && result.social_media_origin.platform !== 'Unknown' ? `
                <div class="analysis-section">
                    <div class="analysis-title">🌐 SOCIAL MEDIA ORIGIN</div>
                    <div class="analysis-box">
                        <p><strong>Platform:</strong> ${result.social_media_origin.icon || '📱'} ${result.social_media_origin.platform}</p>
                        <p><strong>Confidence:</strong> ${result.social_media_origin.confidence}</p>
                        ${result.social_media_origin.description ? `<p><strong>Note:</strong> ${result.social_media_origin.description}</p>` : ''}
                    </div>
                </div>
                ` : ''}
                
                <div class="footer-note">
                    🔍 EXIF Analysis Complete | Forensic Mode Active
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

function displayFolderResultsTyposquatStyle(results, gpsPoints) {
    const container = document.getElementById('exifResultsArea');
    if (!container) return;
    
    const successful = results.filter(r => r.success !== false);
    const gpsCount = gpsPoints.length;
    const aiCount = successful.filter(r => r.ai_generation_detection?.is_ai_generated).length;
    
    let html = `
        <div class="result-card" style="margin-bottom: 24px;">
            <div class="result-header">
                <span class="result-url">📁 BULK ANALYSIS REPORT</span>
                <span class="risk-badge ${gpsCount > 0 ? 'risk-high' : 'risk-low'}">${gpsCount} GPS FOUND</span>
            </div>
            <div class="result-content">
                <div class="stats-grid" style="margin-bottom: 20px;">
                    <div class="stat-block"><div class="stat-big-number">${results.length}</div><div class="stat-small-label">Total Images</div></div>
                    <div class="stat-block"><div class="stat-big-number safe">${successful.length}</div><div class="stat-small-label">Analyzed</div></div>
                    <div class="stat-block"><div class="stat-big-number" style="color:#00d4ff;">${gpsCount}</div><div class="stat-small-label">📍 GPS Found</div></div>
                    <div class="stat-block"><div class="stat-big-number" style="color:#ffb830;">${aiCount}</div><div class="stat-small-label">🤖 AI Detected</div></div>
                </div>
            </div>
        </div>
    `;
    
    for (const result of successful) {
        const gpsInfo = gpsPoints.find(g => g.file === result.file);
        const isAi = result.ai_generation_detection?.is_ai_generated;
        
        let timestampDisplay = '';
        if (result.temporal_info) {
            timestampDisplay = `<p><strong>📅 Date Taken:</strong> ${result.temporal_info.datetime_taken || 'Unknown'}</p>`;
        }
        
        html += `<div class="result-card">
            <div class="result-header">
                <span class="result-url">📷 ${result.file}</span>
                <span class="risk-badge ${gpsInfo ? 'risk-high' : (isAi ? 'risk-medium' : 'risk-low')}">
                    ${gpsInfo ? '📍 GPS' : (isAi ? '🤖 AI' : '📷 METADATA')}
                </span>
            </div>
            <div class="result-content">
                <div class="analysis-section">
                    <div class="analysis-title">CAMERA & TIMESTAMP</div>
                    <div class="analysis-box">
                        <p><strong>Camera:</strong> ${result.camera_info?.make || 'Unknown'} ${result.camera_info?.model || ''}</p>
                        ${timestampDisplay}
                        <p><strong>Resolution:</strong> ${result.basic_info?.width || '?'} x ${result.basic_info?.height || '?'}</p>
                        <p><strong>ISO:</strong> ${result.camera_settings?.iso || 'N/A'} | <strong>Aperture:</strong> f/${result.camera_settings?.f_number || 'N/A'}</p>
                    </div>
                </div>`;
        
        if (gpsInfo) {
            html += `<div class="analysis-section">
                <div class="analysis-title">📍 GPS LOCATION</div>
                <div class="analysis-box" style="border-color: #ff3b5c;">
                    <p><strong>Coordinates:</strong> ${gpsInfo.lat}, ${gpsInfo.lon}</p>
                    <p><strong>Address:</strong> ${gpsInfo.address}</p>
                    <p><a href="https://www.google.com/maps?q=${gpsInfo.lat},${gpsInfo.lon}" target="_blank" style="color: #00f5ff;">🗺️ Open in Maps →</a></p>
                </div>
            </div>`;
        }
        
        if (isAi) {
            html += `<div class="analysis-section">
                <div class="analysis-title">🤖 AI GENERATED</div>
                <div class="analysis-box" style="border-color: #ffb830;">
                    <p>⚠️ This image appears to be AI generated (${result.ai_generation_detection.ai_tool || 'Unknown'})</p>
                </div>
            </div>`;
        }
        
        html += `</div></div>`;
    }
    
    container.innerHTML = html;
}

function clearExif() {
    currentImageData = null;
    currentExifResult = null;
    currentExifResultsList = [];
    folderFiles = [];
    folderAnalysisResults = [];
    
    const fileInput = document.getElementById('exifFileInput');
    const folderInput = document.getElementById('folderFileInput');
    const previewDiv = document.getElementById('exifImagePreview');
    const resultsArea = document.getElementById('exifResultsArea');
    const exportBtns = document.getElementById('exifExportBtns');
    const progressDiv = document.getElementById('analysisProgress');
    
    if (fileInput) fileInput.value = '';
    if (folderInput) folderInput.value = '';
    if (previewDiv) previewDiv.style.display = 'none';
    if (progressDiv) progressDiv.style.display = 'none';
    if (resultsArea) {
        resultsArea.innerHTML = `<div class="empty-large"><div class="empty-large-icon">🖼️</div>
        <div class="empty-large-text">No Image Analyzed</div>
        <div class="empty-large-sub">Upload an image or folder and click ANALYZE</div></div>`;
    }
    if (exportBtns) exportBtns.style.display = 'none';
    addLog('Cleared all EXIF results', 'info');
}

function copyGpsToClipboard() {
    const results = folderAnalysisResults.length > 0 ? folderAnalysisResults : (currentExifResult ? [currentExifResult] : []);
    const gpsPoints = results.filter(r => r.gps_info?.lat);
    if (gpsPoints.length === 0) {
        addLog('No GPS data to copy', 'error');
        return;
    }
    let gpsText = '';
    gpsPoints.forEach(p => {
        gpsText += `${p.file}: ${p.gps_info.lat}, ${p.gps_info.lon}\n`;
    });
    navigator.clipboard.writeText(gpsText);
    addLog('GPS coordinates copied!', 'success');
}

function openInGoogleMaps() {
    const results = folderAnalysisResults.length > 0 ? folderAnalysisResults : (currentExifResult ? [currentExifResult] : []);
    const firstGps = results.find(r => r.gps_info?.lat);
    if (!firstGps) {
        addLog('No GPS data', 'error');
        return;
    }
    window.open(`https://www.google.com/maps?q=${firstGps.gps_info.lat},${firstGps.gps_info.lon}`, '_blank');
}

function exportGpsToCsv() {
    const results = folderAnalysisResults.length > 0 ? folderAnalysisResults : (currentExifResult ? [currentExifResult] : []);
    const gpsPoints = results.filter(r => r.gps_info?.lat);
    if (gpsPoints.length === 0) {
        addLog('No GPS data', 'error');
        return;
    }
    let csv = '"File","Latitude","Longitude","Address"\n';
    gpsPoints.forEach(p => {
        const address = p.location_details?.address || `${p.gps_info.lat}, ${p.gps_info.lon}`;
        csv += `"${p.file}",${p.gps_info.lat},${p.gps_info.lon},"${address.replace(/"/g, '""')}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `gps_data_${Date.now()}.csv`;
    link.click();
    addLog('CSV exported!', 'success');
}

function exportFullReport() {
    const resultsToExport = folderAnalysisResults.length > 0 ? folderAnalysisResults : (currentExifResult ? [currentExifResult] : []);
    if (resultsToExport.length === 0) {
        addLog('No analysis to export', 'error');
        return;
    }
    
    const timestamp = new Date().toLocaleString();
    const reportTitle = folderAnalysisResults.length > 0 ? '📁 FOLDER BULK ANALYSIS REPORT' : '🖼️ EXIF FORENSIC ANALYSIS REPORT';
    
    let reportHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EXIF Forensics Report - ${timestamp}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', 'Roboto', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #f5f7fb;
            padding: 40px 24px;
            color: #1e293b;
        }
        
        .container {
            max-width: 1280px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 24px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
            overflow: hidden;
        }
        
        /* Header - Dark Gradient for Contrast */
        .report-header {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: white;
            padding: 32px 40px;
            border-bottom: 4px solid #38bdf8;
        }
        
        .report-header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .report-header h1 span {
            font-size: 36px;
        }
        
        .report-header .subtitle {
            color: #94a3b8;
            font-size: 14px;
            margin-top: 8px;
        }
        
        .report-meta {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
            padding-top: 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            font-size: 13px;
            color: #cbd5e1;
            flex-wrap: wrap;
            gap: 10px;
        }
        
        /* Summary Cards */
        .summary-section {
            padding: 28px 40px;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .summary-title {
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
            border-left: 4px solid #38bdf8;
            padding-left: 16px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 20px;
        }
        
        .stat-card {
            background: white;
            border-radius: 16px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
        }
        
        .stat-number {
            font-size: 38px;
            font-weight: 800;
            color: #0f172a;
        }
        
        .stat-number.highlight {
            color: #dc2626;
        }
        
        .stat-number.gps {
            color: #0284c7;
        }
        
        .stat-number.ai {
            color: #d97706;
        }
        
        .stat-label {
            font-size: 12px;
            color: #64748b;
            margin-top: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 600;
        }
        
        /* Individual Report Cards - White Background with Image Icon */
        .report-card {
            margin: 28px 40px;
            background: white;
            border-radius: 20px;
            border: 1px solid #e2e8f0;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
            transition: box-shadow 0.2s;
        }
        
        .report-card:hover {
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        }
        
        /* Card Header with Image Icon */
        .card-header {
            background: linear-gradient(135deg, #fafcff 0%, #f1f5f9 100%);
            padding: 20px 28px;
            border-bottom: 2px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 16px;
        }
        
        .filename {
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
            display: flex;
            align-items: center;
            gap: 14px;
        }
        
        .filename .icon {
            font-size: 32px;
            background: #e2e8f0;
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 14px;
        }
        
        .image-counter {
            background: #e2e8f0;
            padding: 4px 12px;
            border-radius: 30px;
            font-size: 11px;
            font-weight: 600;
            color: #475569;
        }
        
        .risk-badge {
            padding: 6px 18px;
            border-radius: 40px;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.5px;
        }
        
        .risk-high {
            background: #fef2f2;
            color: #dc2626;
            border: 1px solid #fecaca;
        }
        
        .risk-medium {
            background: #fffbeb;
            color: #d97706;
            border: 1px solid #fde68a;
        }
        
        .risk-low {
            background: #ecfdf5;
            color: #059669;
            border: 1px solid #a7f3d0;
        }
        
        .card-body {
            padding: 28px;
        }
        
        /* Info Sections - White Theme with Good Contrast */
        .info-section {
            margin-bottom: 28px;
        }
        
        .section-title {
            font-size: 14px;
            font-weight: 800;
            color: #334155;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 10px;
            border-left: 4px solid #38bdf8;
            padding-left: 14px;
        }
        
        .info-grid {
            background: #f8fafc;
            border-radius: 16px;
            padding: 20px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
            gap: 16px;
        }
        
        .info-item {
            display: flex;
            flex-direction: column;
        }
        
        .info-label {
            font-size: 11px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
        }
        
        .info-value {
            font-size: 14px;
            font-weight: 600;
            color: #0f172a;
            word-break: break-word;
        }
        
        .info-value.timestamp {
            color: #059669;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            font-weight: 700;
        }
        
        .info-value.gps-coord {
            color: #0284c7;
            font-family: 'Courier New', monospace;
            font-weight: 700;
        }
        
        .warning-text {
            background: #fef3c7;
            color: #92400e;
            padding: 14px 18px;
            border-radius: 12px;
            font-size: 13px;
            margin-top: 16px;
            border-left: 4px solid #f59e0b;
            font-weight: 500;
        }
        
        .warning-text-red {
            background: #fef2f2;
            color: #991b1b;
            border-left-color: #dc2626;
        }
        
        /* Camera Settings Grid */
        .settings-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 12px;
        }
        
        .setting-item {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 12px;
            text-align: center;
        }
        
        .setting-label {
            font-size: 10px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 6px;
        }
        
        .setting-value {
            font-size: 14px;
            font-weight: 800;
            color: #0f172a;
        }
        
        /* GPS Map Link */
        .map-link {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: #0284c7;
            color: white;
            padding: 10px 20px;
            border-radius: 10px;
            text-decoration: none;
            font-size: 13px;
            font-weight: 700;
            margin-top: 16px;
            transition: background 0.2s;
        }
        
        .map-link:hover {
            background: #0369a1;
        }
        
        /* Footer */
        .report-footer {
            background: #f8fafc;
            padding: 24px 40px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            font-size: 12px;
            color: #64748b;
        }
        
        .report-footer .disclaimer {
            margin-top: 8px;
            font-size: 10px;
            color: #94a3b8;
        }
        
        hr {
            border: none;
            border-top: 1px solid #e2e8f0;
            margin: 20px 0;
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            .container {
                box-shadow: none;
            }
            .stat-card:hover {
                transform: none;
            }
            .report-card:hover {
                box-shadow: none;
            }
            .map-link {
                print-color-adjust: exact;
            }
        }
        
        @media (max-width: 768px) {
            body {
                padding: 20px 12px;
            }
            .report-header, .summary-section, .report-card {
                margin-left: 16px;
                margin-right: 16px;
            }
            .card-header {
                flex-direction: column;
                align-items: flex-start;
            }
            .settings-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="report-header">
            <h1>
                <span>🖼️</span> 
                ${reportTitle}
            </h1>
            <div class="subtitle">Professional Forensic Image Analysis Report | Court-Admissible Format</div>
            <div class="report-meta">
                <span>📅 Generated: ${timestamp}</span>
                <span>🔬 Tool: Cyber Security Toolkit Pro</span>
                <span>📊 Status: Analysis Complete</span>
                <span>🔒 Case ID: EXIF-${new Date().getFullYear()}${Math.random().toString(36).substring(2, 6).toUpperCase()}</span>
            </div>
        </div>`;
    
    // Summary Section
    const totalImages = resultsToExport.length;
    const gpsCount = resultsToExport.filter(r => r.gps_info && r.gps_info.lat).length;
    const aiCount = resultsToExport.filter(r => r.ai_generation_detection?.is_ai_generated).length;
    const editedCount = resultsToExport.filter(r => r.manipulation_detection?.is_edited).length;
    const stegoCount = resultsToExport.filter(r => r.steganography_detection?.has_hidden_data).length;
    
    reportHtml += `
        <div class="summary-section">
            <div class="summary-title">
                <span>📊</span> EXECUTIVE SUMMARY
            </div>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">${totalImages}</div>
                    <div class="stat-label">Total Images Analyzed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number gps">${gpsCount}</div>
                    <div class="stat-label">📍 GPS Location Found</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number ai">${aiCount}</div>
                    <div class="stat-label">🤖 AI Generated</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number ${editedCount > 0 ? 'highlight' : ''}">${editedCount}</div>
                    <div class="stat-label">✏️ Edited Images</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number ${stegoCount > 0 ? 'highlight' : ''}">${stegoCount}</div>
                    <div class="stat-label">🕵️ Steganography</div>
                </div>
            </div>
        </div>`;
    
    // Individual Reports with Image Icons and Counters
    for (let idx = 0; idx < resultsToExport.length; idx++) {
        const result = resultsToExport[idx];
        const hasGps = result.gps_info && result.gps_info.lat;
        const isAi = result.ai_generation_detection?.is_ai_generated;
        const isEdited = result.manipulation_detection?.is_edited;
        const hasStego = result.steganography_detection?.has_hidden_data;
        
        let riskLevel = 'LOW';
        let riskBadgeClass = 'risk-low';
        let riskText = '✅ LOW RISK - CLEAN';
        
        if (hasGps) {
            riskLevel = 'HIGH';
            riskBadgeClass = 'risk-high';
            riskText = '📍 HIGH RISK - GPS EXPOSED';
        } else if (isAi) {
            riskLevel = 'MEDIUM';
            riskBadgeClass = 'risk-medium';
            riskText = '🤖 MEDIUM RISK - AI GENERATED';
        } else if (isEdited) {
            riskLevel = 'MEDIUM';
            riskBadgeClass = 'risk-medium';
            riskText = '✏️ MEDIUM RISK - EDITED';
        } else if (hasStego) {
            riskLevel = 'HIGH';
            riskBadgeClass = 'risk-high';
            riskText = '🕵️ HIGH RISK - HIDDEN DATA';
        }
        
        // Image number with proper formatting
        const imageNumber = (idx + 1).toString().padStart(2, '0');
        
        reportHtml += `
            <div class="report-card">
                <div class="card-header">
                    <div class="filename">
                        <span class="icon">🖼️</span>
                        <div>
                            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                                <span style="font-size: 18px;">${result.file || `Image_${imageNumber}`}</span>
                                <span class="image-counter">#${imageNumber} / ${totalImages}</span>
                            </div>
                            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">📸 Image ${imageNumber} of ${totalImages}</div>
                        </div>
                    </div>
                    <div class="risk-badge ${riskBadgeClass}">${riskText}</div>
                </div>
                <div class="card-body">
                    
                    <!-- TIMESTAMP SECTION -->
                    <div class="info-section">
                        <div class="section-title">
                            <span>⏰</span> IMAGE TIMESTAMP
                        </div>
                        <div class="info-grid">
                            <div class="info-item">
                                <div class="info-label">📅 Date Taken</div>
                                <div class="info-value timestamp">${result.temporal_info?.datetime_taken || 'Not available'}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">🕒 Last Modified</div>
                                <div class="info-value">${result.temporal_info?.datetime_modified || 'Not available'}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">🔍 Metadata Source</div>
                                <div class="info-value">${result.temporal_info?.source || 'EXIF Metadata'}</div>
                            </div>
                        </div>
                        ${result.temporal_info?.time_mismatch ? `<div class="warning-text">⚠️ TIME TAMPERING DETECTED: Capture date differs from file modification date</div>` : ''}
                    </div>
                    
                    <!-- CAMERA INFORMATION -->
                    <div class="info-section">
                        <div class="section-title">
                            <span>📷</span> CAMERA INFORMATION
                        </div>
                        <div class="info-grid">
                            <div class="info-item">
                                <div class="info-label">Make / Manufacturer</div>
                                <div class="info-value">${result.camera_info?.make || 'Unknown'}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Camera Model</div>
                                <div class="info-value">${result.camera_info?.model || 'Unknown'}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Software Used</div>
                                <div class="info-value">${result.camera_info?.software || 'Unknown'}</div>
                            </div>
                            ${result.camera_info?.lens && result.camera_info.lens !== 'Unknown' ? `
                            <div class="info-item">
                                <div class="info-label">Lens Model</div>
                                <div class="info-value">${result.camera_info.lens}</div>
                            </div>` : ''}
                        </div>
                    </div>
                    
                    <!-- CAMERA SETTINGS -->
                    <div class="info-section">
                        <div class="section-title">
                            <span>⚙️</span> CAMERA SETTINGS
                        </div>
                        <div class="settings-grid">
                            <div class="setting-item">
                                <div class="setting-label">ISO Sensitivity</div>
                                <div class="setting-value">${result.camera_settings?.iso || 'N/A'}</div>
                            </div>
                            <div class="setting-item">
                                <div class="setting-label">Aperture (f-stop)</div>
                                <div class="setting-value">f/${result.camera_settings?.f_number || 'N/A'}</div>
                            </div>
                            <div class="setting-item">
                                <div class="setting-label">Shutter Speed</div>
                                <div class="setting-value">${result.camera_settings?.exposure_time || 'N/A'}s</div>
                            </div>
                            <div class="setting-item">
                                <div class="setting-label">Focal Length</div>
                                <div class="setting-value">${result.camera_settings?.focal_length || 'N/A'}mm</div>
                            </div>
                            <div class="setting-item">
                                <div class="setting-label">White Balance</div>
                                <div class="setting-value">${result.camera_settings?.white_balance || 'N/A'}</div>
                            </div>
                            <div class="setting-item">
                                <div class="setting-label">Flash</div>
                                <div class="setting-value">${result.camera_settings?.flash || 'N/A'}</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- IMAGE METRICS -->
                    <div class="info-section">
                        <div class="section-title">
                            <span>📐</span> IMAGE METRICS
                        </div>
                        <div class="info-grid">
                            <div class="info-item">
                                <div class="info-label">Dimensions</div>
                                <div class="info-value">${result.basic_info?.width || '?'} × ${result.basic_info?.height || '?'} pixels</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">File Size</div>
                                <div class="info-value">${result.basic_info?.size_kb || '?'} KB (${((result.basic_info?.size_kb || 0) / 1024).toFixed(2)} MB)</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Format</div>
                                <div class="info-value">${result.basic_info?.format || 'Unknown'}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Color Mode</div>
                                <div class="info-value">${result.basic_info?.mode || 'Unknown'}</div>
                            </div>
                        </div>
                    </div>`;
        
        // GPS SECTION (if available)
        if (hasGps) {
            reportHtml += `
                    <div class="info-section">
                        <div class="section-title">
                            <span>📍</span> GPS GEOLOCATION DATA
                        </div>
                        <div class="info-grid">
                            <div class="info-item">
                                <div class="info-label">Latitude</div>
                                <div class="info-value gps-coord">${result.gps_info.lat}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Longitude</div>
                                <div class="info-value gps-coord">${result.gps_info.lon}</div>
                            </div>
                            ${result.gps_info.alt ? `
                            <div class="info-item">
                                <div class="info-label">Altitude</div>
                                <div class="info-value">${result.gps_info.alt} meters</div>
                            </div>` : ''}
                        </div>
                        ${result.location_details?.address ? `
                        <div style="margin-top: 16px;">
                            <div class="info-label">📍 Exact Address</div>
                            <div class="info-value" style="background: #f0f9ff; padding: 12px; border-radius: 12px; margin-top: 6px; border: 1px solid #bae6fd;">${result.location_details.address}</div>
                        </div>` : ''}
                        <a href="https://www.google.com/maps?q=${result.gps_info.lat},${result.gps_info.lon}" target="_blank" class="map-link">
                            🗺️ Open in Google Maps
                        </a>
                    </div>`;
        }
        
        // AI DETECTION SECTION
        if (isAi) {
            reportHtml += `
                    <div class="info-section">
                        <div class="section-title">
                            <span>🤖</span> AI GENERATION DETECTION
                        </div>
                        <div class="warning-text">
                            <strong>⚠️ AI GENERATED IMAGE DETECTED</strong><br><br>
                            <strong>AI Tool:</strong> ${result.ai_generation_detection.ai_tool || 'Unknown'}<br>
                            <strong>Confidence:</strong> ${result.ai_generation_detection.confidence}<br>
                            <strong>Description:</strong> ${result.ai_generation_detection.description || 'This image appears to be generated by artificial intelligence'}<br>
                            ${result.ai_generation_detection.signatures ? `<strong>Signatures:</strong> ${result.ai_generation_detection.signatures.join(', ')}` : ''}
                        </div>
                    </div>`;
        }
        
        // EDITING DETECTION
        if (isEdited) {
            reportHtml += `
                    <div class="info-section">
                        <div class="section-title">
                            <span>✏️</span> MANIPULATION DETECTION
                        </div>
                        <div class="warning-text warning-text-red">
                            <strong>⚠️ IMAGE EDITING DETECTED</strong><br><br>
                            <strong>Software:</strong> ${result.manipulation_detection.editing_software || 'Unknown editing tool'}<br>
                            ${result.manipulation_detection.warnings?.join('<br>') || 'Image has been modified after capture'}
                        </div>
                    </div>`;
        }
        
        // STEGANOGRAPHY
        if (hasStego) {
            reportHtml += `
                    <div class="info-section">
                        <div class="section-title">
                            <span>🕵️</span> STEGANOGRAPHY DETECTION
                        </div>
                        <div class="warning-text warning-text-red">
                            <strong>⚠️ HIDDEN DATA DETECTED</strong><br><br>
                            <strong>Method:</strong> ${result.steganography_detection.method || 'LSB Steganography'}<br>
                            <strong>Confidence:</strong> ${result.steganography_detection.confidence}<br>
                            ${result.steganography_detection.hidden_message ? `<strong>Hidden Message:</strong><br><code style="background: #1e293b; color: #e2e8f0; padding: 8px; display: block; border-radius: 8px; margin-top: 8px; font-size: 11px; overflow-x: auto;">${result.steganography_detection.hidden_message.substring(0, 300)}${result.steganography_detection.hidden_message.length > 300 ? '...' : ''}</code>` : 'Hidden payload detected within image'}
                        </div>
                    </div>`;
        }
        
        // SOCIAL MEDIA ORIGIN
        if (result.social_media_origin && result.social_media_origin.platform !== 'Unknown') {
            reportHtml += `
                    <div class="info-section">
                        <div class="section-title">
                            <span>🌐</span> SOCIAL MEDIA ORIGIN
                        </div>
                        <div class="info-grid">
                            <div class="info-item">
                                <div class="info-label">Platform</div>
                                <div class="info-value">${result.social_media_origin.icon || '📱'} ${result.social_media_origin.platform}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Confidence</div>
                                <div class="info-value">${result.social_media_origin.confidence}</div>
                            </div>
                        </div>
                        ${result.social_media_origin.description ? `<div class="info-value" style="margin-top: 12px; padding: 8px 12px; background: #f1f5f9; border-radius: 8px;">${result.social_media_origin.description}</div>` : ''}
                    </div>`;
        }
        
        // FORENSIC INDICATORS
        if (result.forensic_indicators && result.forensic_indicators.length > 0) {
            reportHtml += `
                    <div class="info-section">
                        <div class="section-title">
                            <span>🔬</span> FORENSIC INDICATORS
                        </div>
                        <div class="info-grid">
                            ${result.forensic_indicators.map(ind => `<div class="info-value" style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${ind}</div>`).join('')}
                        </div>
                    </div>`;
        }
        
        reportHtml += `
                    <hr>
                    <div style="font-size: 11px; color: #94a3b8; text-align: center; display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
                        <span>🔑 Report ID: EXIF-${new Date().getFullYear()}${(idx + 1).toString().padStart(3, '0')}</span>
                        <span>📸 Image ${idx + 1} of ${totalImages}</span>
                        <span>⏱️ Analysis Timestamp: ${timestamp}</span>
                    </div>
                </div>
            </div>`;
    }
    
    reportHtml += `
        <div class="report-footer">
            <p><strong>🔒 Cyber Security Toolkit Pro</strong> | Professional Forensic Analysis Suite v2.0</p>
            <p>This report is generated automatically and contains verified EXIF metadata extracted from the analyzed images.</p>
            <div class="disclaimer">
                ⚖️ <strong>Court-Admissible Report</strong> | Generated by automated forensic tool<br>
                Disclaimer: This report is for investigative and informational purposes only. 
                GPS coordinates and metadata accuracy depend on original image data. For legal proceedings, 
                please verify with original evidence.
            </div>
        </div>
    </div>
</body>
</html>`;
    
    const blob = new Blob([reportHtml], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `exif_forensic_report_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.html`;
    link.click();
    addLog('📄 Professional white-theme forensic report exported with image containers!', 'success');
}
// ==================== HISTORY FUNCTIONS ====================
async function loadHistory(toolFilter = 'all') {
    try {
        let url = '/api/history?limit=50';
        if (toolFilter !== 'all') {
            url += `&tool=${toolFilter}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success && data.history) {
            displayHistory(data.history);
        } else {
            displayHistory([]);
        }
    } catch (error) {
        addLog(`Error loading history: ${error.message}`, 'error');
        displayHistory([]);
    }
}

function displayHistory(history) {
    const container = document.getElementById('historyResultsArea');
    if (!container) {
        console.log("Container not found!");
        return;
    }
    
    console.log("Displaying history, items:", history.length);
    
    if (!history || history.length === 0) {
        container.innerHTML = `
            <div class="empty-large">
                <div class="empty-large-icon">📋</div>
                <div class="empty-large-text">No History Found</div>
                <div class="empty-large-sub">Use tools to see your activity history here</div>
            </div>
        `;
        return;
    }
    
    // Sort history by date (newest to oldest for display)
    const sortedHistory = [...history].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    let html = `<div class="history-list" style="max-height: 600px; overflow-y: auto;">`;
    
    // Add summary stats at top
    const totalItems = history.length;
    const typosquatCount = history.filter(h => h.tool_name === 'typosquat').length;
    const passwordCount = history.filter(h => h.tool_name === 'password').length;
    const exifCount = history.filter(h => h.tool_name === 'exif').length;
    
    html += `
        <div style="
            background: linear-gradient(135deg, #0f111a, #121520);
            border-radius: 16px;
            padding: 16px 20px;
            margin-bottom: 20px;
            border: 1px solid #1f2230;
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                <div>
                    <div style="font-size: 12px; color: #6b7280;">TOTAL ACTIVITIES</div>
                    <div style="font-size: 28px; font-weight: 800; color: #00d4ff;">${totalItems}</div>
                </div>
                <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                    <div style="text-align: center;">
                        <div style="font-size: 20px;">🎯</div>
                        <div style="font-size: 18px; font-weight: 700; color: #f59e0b;">${typosquatCount}</div>
                        <div style="font-size: 10px; color: #6b7280;">Typosquat</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 20px;">🔐</div>
                        <div style="font-size: 18px; font-weight: 700; color: #10b981;">${passwordCount}</div>
                        <div style="font-size: 10px; color: #6b7280;">Password</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 20px;">🖼️</div>
                        <div style="font-size: 18px; font-weight: 700; color: #8b5cf6;">${exifCount}</div>
                        <div style="font-size: 10px; color: #6b7280;">EXIF</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    for (const item of sortedHistory) {
        let toolIcon = '🔧';
        let toolColor = '#00d4ff';
        let bgIcon = 'rgba(0,212,255,0.1)';
        
        if (item.tool_name === 'typosquat') {
            toolIcon = '🎯';
            toolColor = '#f59e0b';
            bgIcon = 'rgba(245,158,11,0.1)';
        } else if (item.tool_name === 'password') {
            toolIcon = '🔐';
            toolColor = '#10b981';
            bgIcon = 'rgba(16,185,129,0.1)';
        } else if (item.tool_name === 'exif') {
            toolIcon = '🖼️';
            toolColor = '#8b5cf6';
            bgIcon = 'rgba(139,92,246,0.1)';
        }
        
        // Format date and time
        const dateObj = new Date(item.created_at);
        const formattedDate = dateObj.toLocaleDateString('en-PK', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        const formattedTime = dateObj.toLocaleTimeString('en-PK', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        html += `
            <div class="history-item" style="
                background: #0f111a;
                border: 1px solid #1f2230;
                border-radius: 14px;
                padding: 14px 18px;
                margin-bottom: 12px;
                transition: all 0.2s;
            ">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                    <div style="
                        width: 36px;
                        height: 36px;
                        background: ${bgIcon};
                        border-radius: 10px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 18px;
                    ">${toolIcon}</div>
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                            <span style="font-weight: 700; color: ${toolColor}; font-size: 14px;">${item.tool_name.toUpperCase()}</span>
                            <span style="font-size: 10px; background: #1f2230; padding: 2px 8px; border-radius: 20px; color: #8a9bb0;">${formattedTime}</span>
                        </div>
                        <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">
                            📅 ${formattedDate}
                        </div>
                    </div>
                </div>
                <div style="
                    background: #0a0c15;
                    border-radius: 10px;
                    padding: 10px 12px;
                    margin-top: 8px;
                ">
                    <div style="font-size: 12px; color: #c8d8f0;">
                        <span style="color: #8a9bb0;">📝 Input:</span> ${escapeHtml(item.input_data)}
                    </div>
                    <div style="font-size: 12px; color: #c8d8f0; margin-top: 6px;">
                        <span style="color: #8a9bb0;">📊 Result:</span> ${escapeHtml(item.output_summary)}
                    </div>
                </div>
            </div>
        `;
    }
    
    html += `</div>`;
    container.innerHTML = html;
}
function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            window.location.href = '/logout';
        });
    }
}

function setupHistoryPanel() {
    const historyBtn = document.getElementById('navHistory');
    if (historyBtn) {
        historyBtn.addEventListener('click', () => {
            console.log("History button clicked");
            switchTool('history');
            loadHistory();
        });
    }
    
    const refreshBtn = document.getElementById('refreshHistoryBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            const filter = document.getElementById('historyFilter')?.value || 'all';
            loadHistory(filter);
            addLog('History refreshed', 'success');
        });
    }
    
    const filterSelect = document.getElementById('historyFilter');
    if (filterSelect) {
        filterSelect.addEventListener('change', () => {
            loadHistory(filterSelect.value);
        });
    }
}

function exportReport() {
    console.log("Export button clicked, currentTool:", currentTool);
    console.log("currentAnalysis length:", currentAnalysis.length);
    
    if (currentTool === 'typosquat') {
        if (currentAnalysis && currentAnalysis.length > 0) {
            console.log("Generating typosquat report...");
            generateTyposquatReport();
        } else {
            addLog('❌ No typosquat analysis to export. Please analyze some domains first.', 'error');
        }
    } else if (currentTool === 'exif') {
        if (folderAnalysisResults.length > 0 || currentExifResult) {
            exportFullReport();
        } else {
            addLog('❌ No EXIF analysis to export. Please analyze an image first.', 'error');
        }
    } else if (currentTool === 'password') {
        addLog('📝 Password analysis report export will be available soon.', 'info');
    } else {
        addLog('❌ No analysis to export. Please run a tool first.', 'error');
    }
}

// ==================== EVENT LISTENERS ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded - setting up event listeners");
    
    // Tool switching
    document.getElementById('navHome')?.addEventListener('click', () => switchTool('home'));
    document.getElementById('navTyposquat')?.addEventListener('click', () => switchTool('typosquat'));
    document.getElementById('navPassword')?.addEventListener('click', () => switchTool('password'));
    document.getElementById('navExif')?.addEventListener('click', () => switchTool('exif'));
    
    // Typosquat events
    document.getElementById('analyzeBtn')?.addEventListener('click', startTyposquatAnalysis);
    document.getElementById('sampleBtn')?.addEventListener('click', loadTyposquatSamples);
    document.getElementById('clearBtn')?.addEventListener('click', clearTyposquat);
    
    // Password events
    document.getElementById('analyzePasswordBtn')?.addEventListener('click', analyzePassword);
    document.getElementById('samplePasswordBtn')?.addEventListener('click', loadPasswordSample);
    document.getElementById('clearPasswordBtn')?.addEventListener('click', clearPassword);
    
    // EXIF events
    document.getElementById('analyzeExifBtn')?.addEventListener('click', analyzeSingleImage);
    document.getElementById('analyzeFolderBtn')?.addEventListener('click', analyzeFolder);
    document.getElementById('clearExifBtn')?.addEventListener('click', clearExif);
    document.getElementById('exportExifReportBtn')?.addEventListener('click', exportFullReport);
    document.getElementById('copyExifGpsBtn')?.addEventListener('click', copyGpsToClipboard);
    document.getElementById('openExifMapsBtn')?.addEventListener('click', openInGoogleMaps);
    document.getElementById('exportExifCsvBtn')?.addEventListener('click', exportGpsToCsv);
    document.getElementById('exportBulkReportBtn')?.addEventListener('click', exportFullReport);
    
    document.getElementById('exifRemovePreview')?.addEventListener('click', function() {
        document.getElementById('exifImagePreview').style.display = 'none';
        document.getElementById('exifFileInput').value = '';
        currentImageData = null;
    });
    
    // Setup uploads
    setupExifUpload();
    setupFolderUpload();
    
    // Setup History & Logout
    setupHistoryPanel();
    setupLogout();
    
    // Export button
    document.getElementById('exportReportBtn')?.addEventListener('click', exportReport);
    
    switchTool('home');
    addLog('Cyber Security Toolkit Pro ready | 3 Tools Active', 'success');
});