# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""
Aciso Agent - Production-Ready Data Science Agent

Moderner Agent für Churn-Analyse und Kundenretention in Fitness-Studios
basierend auf Google ADK Best Practices.

Architektur:
- Koordinator-Agent: Intent-Erkennung und Routing
- BigQuery-Agent: NL2SQL und Datenabfragen  
- Strategie-Agent: Python-Analysen und Retention-Strategien

Features:
- Sichere BigQuery-Integration mit Validierung
- ML-basierte Churn-Vorhersagen
- Automatische Retention-Plan-Generierung
- Umfassendes State Management
"""

import logging
from typing import Any

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import the main agent following ADK patterns
from .agent import get_aciso_agent, root_agent

logger.info("SUCCESS: Aciso Agent loaded successfully")
logger.info("   Architecture: Coordinator + StructuredData + Strategy Agents")
logger.info("   Focus: Churn-Analyse und Kundenretention")

# Export the main components (ADK expects root_agent)
__all__ = ["get_aciso_agent", "root_agent"]

# Module metadata
__version__ = "1.0.0"
__description__ = "Production-Ready Data Science Agent for Churn Analysis"
__architecture__ = "ADK Multi-Agent System"