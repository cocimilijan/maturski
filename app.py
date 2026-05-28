import os
import requests
from datetime import timedelta
from flask import Flask, render_template, request, redirect, url_for, session, flash
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "Stolica334@")

# Sigurnosna podešavanja sesije
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.permanent_session_lifetime = timedelta(days=7)

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_current_user():
    return session.get('user')

def get_base_url():
    if request.headers.get('X-Forwarded-Proto') == 'https':
        return f"https://{request.host}"
    return request.url_root.rstrip('/')

# ==========================================
# AUTENTIFIKACIJA
# ==========================================
@app.route('/registracija', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')

        if len(password) < 8:
            flash('Lozinka mora imati najmanje 8 karaktera!', 'error')
            return redirect(url_for('register'))

        if password != confirm_password:
            flash('Lozinke se ne poklapaju!', 'error')
            return redirect(url_for('register'))

        username = email.split('@')[0]
        
        try:
            redirect_link = f"{get_base_url()}/potvrda_emaila"
            
            auth_response = supabase.auth.sign_up({
                "email": email, 
                "password": password,
                "options": {
                    "email_redirect_to": redirect_link
                }
            })
            
            if auth_response.user:
                supabase.table('korisnici').insert({
                    "id": auth_response.user.id, 
                    "email": email, 
                    "username": username,
                    "avatar": "1.png" # Vraćeno na fiksno 1.png za sve
                }).execute()
            
            flash('Registracija uspešna! Poslat vam je link za potvrdu na email.', 'success')
            return redirect(url_for('login'))
        except Exception as e:
            flash('Došlo je do greške ili email već postoji.', 'error')
    return render_template('register.html')

@app.route('/potvrda_emaila')
def email_confirmed():
    return render_template('potvrda_emaila.html')

@app.route('/prijava', methods=['GET', 'POST'])
def login():
    unconfirmed_email = None
    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')

        try:
            response = supabase.auth.sign_in_with_password({"email": email, "password": password})
            session.permanent = True
            session['user'] = response.user.id
            flash('Uspešna prijava!', 'success')
            return redirect(url_for('index'))
        except Exception as e:
            error_msg = str(e).lower()
            if "email not confirmed" in error_msg:
                flash('Vaša email adresa nije potvrđena.', 'error')
                unconfirmed_email = email
            else:
                flash('Pogrešna email adresa ili lozinka.', 'error')

    return render_template('login.html', unconfirmed_email=unconfirmed_email)

@app.route('/ponovo_posalji_potvrdu', methods=['POST'])
def resend_confirmation():
    email = request.form.get('email', '').strip().lower()
    if email:
        try:
            redirect_link = f"{get_base_url()}/potvrda_emaila"
            supabase.auth.resend({"type": "signup", "email": email, "options": {"email_redirect_to": redirect_link}})
            flash('Novi link za potvrdu je poslat!', 'success')
        except Exception as e:
            flash('Ako nalog postoji i nije potvrđen, novi link je poslat.', 'success')
            
    return redirect(url_for('login'))

@app.route('/odjava')
def logout():
    session.pop('user', None)
    supabase.auth.sign_out()
    flash('Uspešno ste se odjavili.', 'success')
    return redirect(url_for('index'))

@app.route('/zaboravljena_lozinka', methods=['GET', 'POST'])
def forgot_password():
    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        try:
            redirect_link = f"{get_base_url()}/postavi_novu_lozinku"
            supabase.auth.reset_password_for_email(email, options={"redirect_to": redirect_link})
            flash('Poslat je link za promenu lozinke. Proverite Spam!', 'success')
            return redirect(url_for('login'))
        except Exception as e:
            flash('Poslat je link za promenu lozinke. Proverite Spam!', 'success')
    return render_template('forgot_password.html')

@app.route('/postavi_novu_lozinku', methods=['GET', 'POST'])
def set_new_password():
    if request.method == 'POST':
        nova_lozinka = request.form.get('nova_lozinka')
        potvrdi_lozinku = request.form.get('potvrdi_lozinku')
        access_token = request.form.get('access_token')
        refresh_token = request.form.get('refresh_token')

        if len(nova_lozinka) < 8:
            flash('Lozinka mora imati najmanje 8 karaktera!', 'error')
            return redirect(request.url)

        if nova_lozinka != potvrdi_lozinku:
            flash('Lozinke se ne poklapaju!', 'error')
            return redirect(request.url)

        try:
            supabase.auth.set_session(access_token, refresh_token)
            supabase.auth.update_user({"password": nova_lozinka})
            flash('Vaša lozinka je uspešno promenjena! Sada se prijavite.', 'success')
            return redirect(url_for('login'))
        except Exception as e:
            flash('Bezbednosni link je nevažeći ili istekao.', 'error')
            return redirect(url_for('forgot_password'))

    return render_template('set_new_password.html')

# ==========================================
# GLAVNE STRANICE I JIKAN API
# ==========================================
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/anime/<int:anime_id>')
def anime_detail(anime_id):
    korisnik_id = get_current_user()
    try:
        jikan_response = requests.get(f'https://api.jikan.moe/v4/anime/{anime_id}/full')
        anime_data = jikan_response.json().get('data', {})
    except:
        anime_data = None
        flash('Nije moguće učitati podatke sa Jikan servera.', 'error')

    user_review = None
    if korisnik_id:
        try:
            response = supabase.table('korisnik_anime').select('*').eq('korisnik_id', korisnik_id).eq('anime_id', anime_id).execute()
            if len(response.data) > 0:
                user_review = response.data[0]
        except Exception:
            pass

    return render_template('anime_detail.html', anime=anime_data, review=user_review)

@app.route('/pretraga')
def search():
    query = request.args.get('q', '')
    if not query:
        return redirect(url_for('index'))
    api_url = f"https://api.jikan.moe/v4/anime?q={query}&sfw=true"
    return render_template('explore.html', title=f"Pretraga: {query}", base_api_url=api_url)

@app.route('/top')
def top_anime():
    api_url = "https://api.jikan.moe/v4/top/anime?sfw=true"
    return render_template('explore.html', title="Najbolje Ocenjeni Serijali", base_api_url=api_url)

@app.route('/sezona')
def season():
    api_url = "https://api.jikan.moe/v4/seasons/now?sfw=true"
    return render_template('explore.html', title="Trenutna Sezona", base_api_url=api_url)

# ==========================================
# FUNKCIJE ZA KORISNIKA I PROFIL
# ==========================================
@app.route('/sacuvaj_anime', methods=['POST'])
def save_anime():
    korisnik_id = get_current_user()
    if not korisnik_id:
        flash('Morate biti prijavljeni da biste dodali anime!', 'error')
        return redirect(url_for('login'))

    anime_id = request.form.get('anime_id')
    status = request.form.get('status')
    ocena_raw = request.form.get('ocena')

    try:
        ocena = int(ocena_raw) if ocena_raw and str(ocena_raw).strip() != "" else 0
    except ValueError:
        ocena = 0

    try:
        postojeci = supabase.table('korisnik_anime').select('*').eq('korisnik_id', korisnik_id).eq('anime_id', int(anime_id)).execute()
        
        if len(postojeci.data) > 0:
            supabase.table('korisnik_anime').update({'status': status, 'ocena': ocena}).eq('korisnik_id', korisnik_id).eq('anime_id', int(anime_id)).execute()
        else:
            supabase.table('korisnik_anime').insert({'korisnik_id': korisnik_id, 'anime_id': int(anime_id), 'status': status, 'ocena': ocena}).execute()
            
        flash('Vaša lista je uspešno ažurirana!', 'success')
    except Exception as e:
        flash('Došlo je do greške pri čuvanju podataka.', 'error')
        
    return redirect(url_for('anime_detail', anime_id=anime_id))

@app.route('/profil')
def profile():
    korisnik_id = get_current_user()
    if not korisnik_id:
        flash('Morate biti prijavljeni za pristup profilu.', 'error')
        return redirect(url_for('login'))
        
    try:
        user_info = supabase.table('korisnici').select('*').eq('id', korisnik_id).execute()
        korisnik = user_info.data[0] if user_info.data else None

        response = supabase.table('korisnik_anime').select('*').eq('korisnik_id', korisnik_id).execute()
        saved_anime_list = response.data
    except Exception:
        saved_anime_list = []
        korisnik = None
        flash('Nije moguće učitati profil.', 'error')

    return render_template('profile.html', my_list=saved_anime_list, korisnik=korisnik)

@app.route('/obrisi_anime/<int:anime_id>', methods=['POST'])
def delete_anime(anime_id):
    korisnik_id = get_current_user()
    if korisnik_id:
        supabase.table('korisnik_anime').delete().eq('korisnik_id', korisnik_id).eq('anime_id', anime_id).execute()
        flash('Anime je uspešno uklonjen iz vaše liste.', 'success')
    return redirect(url_for('profile'))

@app.route('/azuriraj_profil', methods=['POST'])
def update_profile():
    korisnik_id = get_current_user()
    if not korisnik_id:
        return redirect(url_for('login'))

    novi_username = request.form.get('username')
    novi_avatar = request.form.get('avatar') 

    try:
        supabase.table('korisnici').update({"username": novi_username, "avatar": novi_avatar}).eq('id', korisnik_id).execute()
        flash('Profil je uspešno ažuriran!', 'success')
    except Exception as e:
        flash('Greška pri ažuriranju profila.', 'error')

    return redirect(url_for('profile'))

@app.route('/promeni_lozinku', methods=['POST'])
def change_password():
    korisnik_id = get_current_user()
    if not korisnik_id:
        return redirect(url_for('login'))

    stara_lozinka = request.form.get('stara_lozinka')
    nova_lozinka = request.form.get('nova_lozinka')
    potvrdi_lozinku = request.form.get('potvrdi_lozinku')

    if len(nova_lozinka) < 8:
        flash('Nova lozinka mora imati najmanje 8 karaktera!', 'error')
        return redirect(url_for('profile'))

    if nova_lozinka != potvrdi_lozinku:
        flash('Nove lozinke se ne poklapaju!', 'error')
        return redirect(url_for('profile'))

    try:
        user_info = supabase.table('korisnici').select('email').eq('id', korisnik_id).execute()
        email = user_info.data[0]['email']

        supabase.auth.sign_in_with_password({"email": email, "password": stara_lozinka})
        supabase.auth.update_user({"password": nova_lozinka})
        flash('Lozinka je uspešno promenjena!', 'success')
    except Exception:
        flash('Stara lozinka nije ispravna.', 'error')

    return redirect(url_for('profile'))

if __name__ == '__main__':
    app.run(debug=True, port=5000)