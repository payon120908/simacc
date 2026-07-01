import zipfile
import os

def zip_project():
    zip_name = "accounting-system-deploy.zip"
    files_to_zip = ["index.html", "server.py", "package.json", ".env.example", "Dockerfile", "start-ledger.bat", "start-online-ledger.bat", "requirements.txt"]
    folders_to_zip = ["css", "js", "database", "database_template"]
    
    print(f"Creating {zip_name} for deployment...")
    
    with zipfile.ZipFile(zip_name, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # Zip individual files
        for file in files_to_zip:
            if os.path.exists(file):
                zipf.write(file)
                print(f"Added file: {file}")
                
        # Zip folders recursively
        for folder in folders_to_zip:
            if os.path.exists(folder):
                for root, dirs, files in os.walk(folder):
                    for file in files:
                        file_path = os.path.join(root, file)
                        # Exclude active database files to prevent overwriting user data during updates
                        if folder == "database" and file.endswith(".db"):
                            print(f"Skipping active database file: {file_path}")
                            continue
                        zipf.write(file_path)
                print(f"Added folder: {folder}")
                
    print(f"Successfully created {zip_name}! You can now deploy this package to your Node.js server or host.")

if __name__ == "__main__":
    zip_project()

