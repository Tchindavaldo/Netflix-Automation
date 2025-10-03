import random
from datetime import datetime, timedelta

# --- Configuration ---
NUM_LINES = 6000  # Nombre total de requêtes simulées
FILENAME = "access_nginx_ddos_1000.log"  # Nom du fichier de sortie
METHODS = ["GET", "POST"]  # Méthodes HTTP simulées
URLS = ["/", "/login", "/api/data", "/dashboard"]  # URLs simulées
HTTP_CODES = [200, 404, 500]  # Codes de réponse simulés
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "curl/7.68.0",
    "PostmanRuntime/7.29.0"
]  # User-agents simulés

# --- Génération des adresses IP simulées ---
def generate_ip():
    return ".".join(str(random.randint(1, 254)) for _ in range(4))

# --- Génération du timestamp pour chaque requête ---
start_time = datetime.now()  # Heure de départ pour la simulation
time_increment = timedelta(seconds=0.001)  # Intervalle très court pour simuler un flood

# --- Création du fichier log ---
with open(FILENAME, "w") as f:
    current_time = start_time
    for i in range(NUM_LINES):
        ip = generate_ip()  # Génère une IP aléatoire (niveau "source IP")
        method = random.choice(METHODS)  # Choisit une méthode HTTP aléatoire
        url = random.choice(URLS)  # Choisit une URL simulée
        code = random.choice(HTTP_CODES)  # Choisit un code de réponse simulé
        size = random.randint(100, 5000)  # Taille des données retournées
        user_agent = random.choice(USER_AGENTS)  # Choisit un user-agent simulé

        # Format Nginx log (simplifié)
        log_line = f'{ip} - - [{current_time.strftime("%d/%b/%Y:%H:%M:%S")}] "{method} {url} HTTP/1.1" {code} {size} "{user_agent}"\n'
        f.write(log_line)  # Écriture dans le fichier

        current_time += time_increment  # Incrémente le temps pour la requête suivante
