import jinja2
import matplotlib.pyplot as plt
import matplotlib.style as mplstyle
import io
import base64
import json
from datetime import datetime
from pathlib import Path
from weasyprint import HTML, CSS
import logging

logger = logging.getLogger(__name__)

# Set matplotlib to use non-interactive backend
import matplotlib
matplotlib.use('Agg')  # Must be before pyplot import
plt.style.use('default')  # Use default style instead of deprecated seaborn

def create_clv_chart(clv_status_quo, clv_retention, monthly_fee=100):
    """
    Generiert ein professionelles CLV-Balkendiagramm und gibt es als Base64-String zurück.
    """
    try:
        # Create figure with custom size and DPI for better quality
        fig, ax = plt.subplots(figsize=(10, 6), dpi=150)
        
        labels = ['Status Quo', 'Mit Retention Plan']
        values = [clv_status_quo, clv_retention]
        colors = ['#ef4444', '#22c55e']  # Red for status quo, green for retention
        
        # Create bars
        bars = ax.bar(labels, values, color=colors, alpha=0.8, edgecolor='white', linewidth=2)
        
        # Customize the chart
        ax.set_ylabel('Customer Lifetime Value (€)', fontsize=12, fontweight='bold')
        ax.set_title('CLV-Vergleich: Status Quo vs. Retention Plan', fontsize=14, fontweight='bold', pad=20)
        
        # Add value labels on top of bars
        for bar, value in zip(bars, values):
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height + max(values) * 0.01,
                   f'€{value:,.0f}', ha='center', va='bottom', fontweight='bold', fontsize=11)
        
        # Improve the layout
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.spines['left'].set_color('#e2e8f0')
        ax.spines['bottom'].set_color('#e2e8f0')
        ax.tick_params(axis='both', which='major', labelsize=10, colors='#64748b')
        ax.grid(True, alpha=0.3)
        
        # Format y-axis to show currency
        ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'€{x:,.0f}'))
        
        # Add improvement percentage
        improvement = ((clv_retention - clv_status_quo) / clv_status_quo * 100) if clv_status_quo > 0 else 0
        ax.text(0.5, max(values) * 0.85, f'Verbesserung: +{improvement:.1f}%', 
               ha='center', va='center', transform=ax.transData, 
               bbox=dict(boxstyle='round,pad=0.5', facecolor='#f0f9ff', edgecolor='#0ea5e9'),
               fontsize=12, fontweight='bold', color='#0369a1')
        
        plt.tight_layout()
        
        # Save to buffer
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight', facecolor='white', edgecolor='none')
        plt.close(fig)  # Important: close figure to prevent memory leaks
        buf.seek(0)
        
        # Encode as base64
        image_base64 = base64.b64encode(buf.read()).decode('utf-8')
        buf.close()
        
        return image_base64
        
    except Exception as e:
        logger.error(f"Error creating CLV chart: {e}")
        return None

def create_retention_plan_pdf(plan_data, output_path):
    """
    Erstellt ein PDF aus den Retention-Plan-Daten.
    
    Args:
        plan_data (dict): Dictionary mit der JSON-Struktur des Retention Plans
        output_path (str): Pfad für die Ausgabe-PDF-Datei
    """
    try:
        # Get the directory of this script to find the template
        script_dir = Path(__file__).parent
        template_path = script_dir / "retention_plan_template.html"
        
        if not template_path.exists():
            raise FileNotFoundError(f"Template not found: {template_path}")
        
        # Setup Jinja2 environment
        template_loader = jinja2.FileSystemLoader(searchpath=str(script_dir))
        template_env = jinja2.Environment(loader=template_loader)
        template = template_env.get_template("retention_plan_template.html")
        
        # Extract data from plan_data
        executive_summary = plan_data.get('executive_summary', {})
        customer_profile = plan_data.get('customer_profile', {})
        top_actions = plan_data.get('top_actions', [])
        
        # Generate CLV chart if we have the data
        clv_chart_base64 = None
        clv_status_quo = executive_summary.get('clv_status_quo', 0)
        clv_retention = executive_summary.get('clv_retention', 0)
        monthly_fee = customer_profile.get('key_metrics', {}).get('monthly_fee', 100)
        
        if clv_status_quo > 0 and clv_retention > 0:
            clv_chart_base64 = create_clv_chart(clv_status_quo, clv_retention, monthly_fee)
        
        # Prepare template context
        context = {
            'executive_summary': executive_summary,
            'customer_profile': customer_profile,
            'top_actions': top_actions,
            'clv_chart_base64': clv_chart_base64,
            'creation_date': datetime.now().strftime('%d.%m.%Y %H:%M'),
        }
        
        # Render HTML
        rendered_html = template.render(context)
        
        # Generate PDF
        html_doc = HTML(string=rendered_html)
        
        # Custom CSS for better PDF styling
        css = CSS(string="""
            @page {
                size: A4;
                margin: 1.5cm;
            }
            body {
                font-size: 10pt;
                line-height: 1.4;
            }
            .header {
                margin-bottom: 0.8rem !important;
                padding: 1rem !important;
            }
            .metrics-grid, .profile-section, .actions-section {
                margin: 0.8rem 0 !important;
            }
            .insight-box {
                margin: 0.8rem 0 !important;
                padding: 0.8rem !important;
            }
            h2 {
                margin: 1rem 0 0.6rem 0 !important;
            }
            .action-card {
                margin-bottom: 0.8rem !important;
                padding: 1rem !important;
            }
            .chart-section {
                margin: 0.8rem 0 !important;
            }
            .footer {
                margin-top: 1rem !important;
                padding-top: 0.8rem !important;
            }
        """)
        
        # Write PDF
        html_doc.write_pdf(output_path, stylesheets=[css])
        
        logger.info(f"PDF successfully created: {output_path}")
        return True
        
    except Exception as e:
        logger.error(f"Error creating PDF: {e}")
        return False

def create_retention_plan_pdf_from_json_string(json_string, output_path):
    """
    Erstellt ein PDF aus einem JSON-String.
    
    Args:
        json_string (str): JSON-String mit den Retention-Plan-Daten
        output_path (str): Pfad für die Ausgabe-PDF-Datei
    """
    try:
        plan_data = json.loads(json_string)
        return create_retention_plan_pdf(plan_data, output_path)
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON string: {e}")
        return False

# Example usage for testing
if __name__ == "__main__":
    # Test data
    test_data = {
        "executive_summary": {
            "churn_risk": 75,
            "clv_uplift": 1250,
            "roi_estimate": 180,
            "top_insight": "Kunde zeigt hohes Churn-Risiko aufgrund mangelnder Aktivität. Gezielte Interventionen können CLV signifikant steigern.",
            "clv_status_quo": 850,
            "clv_retention": 2100
        },
        "customer_profile": {
            "id": 12345,
            "age_group": "35-44",
            "value_tier": "Premium",
            "membership_stage": "Etabliert",
            "activity_status": "Inaktiv",
            "key_metrics": {
                "days_inactive": 45,
                "monthly_visits": 2,
                "monthly_fee": 89,
                "engagement_score": 3.2
            }
        },
        "top_actions": [
            {
                "title": "Personalisierte Trainingsempfehlungen",
                "description": "Entwicklung eines maßgeschneiderten Trainingsplans basierend auf bisherigen Vorlieben und Aktivitätsmustern.",
                "timeframe": "Sofort",
                "expected_result": "Steigerung der Besuchsfrequenz um 40%",
                "priority": "high",
                "cost_estimate": 25
            },
            {
                "title": "Rabatt auf Personal Training",
                "description": "Zeitlich begrenztes Angebot für vergünstigte Personal Training Sessions.",
                "timeframe": "2 Wochen",
                "expected_result": "Erhöhung des Engagements",
                "priority": "medium",
                "cost_estimate": 150
            }
        ]
    }
    
    # Create test PDF
    create_retention_plan_pdf(test_data, "test_retention_plan.pdf")
    print("Test PDF created: test_retention_plan.pdf")