const fs = require( 'fs' );

// PlaywrightService.js
const { chromium, firefox, webkit } = require( 'playwright' );
let niveauDeClick = 'initialisation';


class PlaywrightService
{
  constructor() {
    this.browser = null;
  }

 async isBrowserValid() {
    try {
        if (!this.browser) return false;
        const context = await this.browser.newContext();
        await context.close();
        return true;
    } catch (e) {
        return false;
    }
}

async initBrowser() {
    const isValid = await this.isBrowserValid();
    if (!isValid) {
        console.log('debut init');
        this.browser = await chromium.launch({
            executablePath: '/usr/bin/google-chrome-stable',
            headless: true,
        });
        console.log('fin init');
    }
}


  async fillForm(url, data) {
    // Assure-toi que le navigateur est lancé
    if (!this.browser) {
      await this.initBrowser();
    }


   let page;

try {
    console.log('page chargement en cours');
    page = await this.browser.newPage();
    await page.setDefaultTimeout(20000); // Timeout global 20s

    // Ton code de navigation ici, par exemple :
    // await page.goto('https://example.com');

} catch (error) {
    console.error("Erreur ouverture de page :", error);
    return { success: false, message: "Impossible d'accéder à la page" };
}

              try
              {
                     await page.goto( url );
                     // await page.goto( url, { waitUntil: 'domcontentloaded', timeout: 60000 } );
                     console.log( 'page charger completment' );

              } catch ( error )
              {
		      
                     console.error( "Erreur 11 lors de la navigation :", error );
		        try {
				
 			await page.screenshot({ path: 'error_screenshot_navigation.png', fullPage: true });
			console.log('Screenshot d\'erreur sauvegardé après navigation.');
		    } catch (screenshotError) {
			console.error('Erreur lors de la capture du screenshot de navigation:', screenshotError);
		    }

		      
                     console.error( "Erreur lors de la navigation :", error );
                     return { success: false, message: "Impossible d'accéder à la page" };
              }

              // await page.goto( url, { waitUntil: 'domcontentloaded' } );

              const rejectButton = page.locator( '#onetrust-reject-all-handler' );

              try
              {
                     await rejectButton.waitFor( { state: 'visible', timeout: 5000 } ); // Attendre max 5s
                     console.log( "Popup de consentement détecté, clic sur 'Reject'..." );
                     await rejectButton.click();
              } catch ( error )
              {
                     console.log( "Aucun popup de consentement détecté, on continue..." );
              }


 

              try
              {


                     await page.click( 'button[data-uia="continue-button"]' );
                     console.log( "execution du click suivant 2" );

              } catch ( error )
              {


                     console.error( "Erreur lors du click sur le 1er btn pour continuer :", error );
                     return { success: false, message: "Impossible d'accéder à la page" };

              }


 

              const planName = 'Standard with ads';
              await page.click( `label:has-text("${ planName }")` );
              console.log( 'clik sur le plan standard with ads' );

              // const planName2 = '€13.99';
              // await page.click( `span:has-text("${ planName2 }")` );
              // console.log( 'clik sur le plan standard ' );

              const planName3 = 'Premium';
              await page.click( `label:has-text("${ planName3 }")` );
              console.log( 'clik sur le plan premium' );







              await page.click( 'button[data-uia="cta-plan-selection"]' );




              await page.click( 'button[data-uia="cta-continue-registration"]' );

              // await page.waitForTimeout( 5000 );

              await page.fill( 'input[data-uia="field-email"]', data.email );

              // Remplir le champ mot de passe
              await page.fill( 'input[data-uia="field-password"]', data.password );

 


              console.log( 'de but de la recherche de la checkbox' );



              // await page.waitForTimeout( 5000 );
              await page.click( 'button[data-uia="cta-registration"]' );
              await page.click( '#creditOrDebitCardDisplayStringId' )
              console.log( 'Clic forcé sur la case effectué avec succès.' );




              // Remplir les champs pour les informations de carte de crédit
              console.log( "Début du remplissage des champs du formulaire de carte de crédit..." );


 

              // Numéro de carte
              await page.fill( 'input[data-uia="field-creditCardNumber"]', data.cardNumber );

              console.log( "Numéro de carte rempli :", data.cardNumber );

              // Date d'expiration
              await page.fill( 'input[data-uia="field-creditExpirationMonth"]', data.expirationDate );
              console.log( "Date d'expiration remplie :", data.expirationDate );

              // CVV
              await page.fill( 'input[data-uia="field-creditCardSecurityCode"]', data.cvv );
              console.log( "CVV rempli :", data.cvv );


              // nameOnCard
              await page.fill( 'input[data-uia="field-name"]', data.nameOnCard );
              console.log( "nom remplir :", data.nameOnCard );


		const codePostal = '75000';  // Remplacer par le code postal souhaité
		await page.fill('input[data-uia="field-creditZipcode"]', codePostal);
		console.log(`Code postal rempli : ${codePostal}`);

	       
	       const inputsDataUia = await page.$$eval('input', inputs => {
	       return inputs.map(input => input.getAttribute('data-uia'));
    		});



	    // Afficher les résultats
	    console.log('Attributs data-uia des inputs :', inputsDataUia.filter(Boolean));

              try
              {

                     // const checkboxTermsOfUse = page.locator( 'input[data-uia="field-consents+rightOfWithdrawal"]' );
                     // const checkboxTermsOfUse = page.locator( 'input[data-uia="field-hasAcceptedTermsOfUse"]' );
                     // await checkboxTermsOfUse.check( { force: true } );
                     console.log( 'saut du la case a cocher' );

              } catch ( error )
              {

                     console.error( 'Erreur lors du clic sur la case à cocher :', error );

                     // Capturer une capture d'écran
                     await page.screenshot( { path: 'error-screenshot.png', fullPage: true } );
                     console.log( '📸 Capture d’écran sauvegardée : error-screenshot.png' );

                     // Sauvegarder le HTML de la page
                     const pageHTML = await page.content();
                     fs.writeFileSync( 'error-page.html', pageHTML );
                     console.log( '📄 HTML de la page sauvegardé : error-page.html' );

                     return { success: false, message: error.message };
              }


              // const acceptTerm = 'You agree that your membership will begin immediately, and acknowledge that you will therefore lose your right of withdrawal.';
              // await page.click( `label:has-text("${ acceptTerm }")` );


              // click sur le btn start MemberShip
              try
              {

                     niveauDeClick = 'click sur le btn start MemberShip';
                     await page.click( 'button[data-uia="action-submit-payment"]' );


                     try
                     {
                            // Attendre soit l'erreur soit la navigation
                            const errorText = await page.waitForSelector( '[data-uia="UIMessage-content"]', { timeout: 10000 } );


                            // Récupérer le texte d'erreur 
                            await page.screenshot( { path: 'error-screenshot1.png', fullPage: true } );
                            console.log( '📸 Capture d’écran 1111 sauvegardée : error-screenshot.png' );


                            return {

                                   success: false,
                                   error: errorText,
                                   niveauDeClick: 'après action-submit-payment',
                                   details: 'Erreur de paiement détectée'

                            };

                     } catch ( error ) { await page.screenshot({path: 'screenshost2.png',fullpage:true});
					console.log('capture effectuer');
					 console.log( "erreur détectée", error ); }


              } catch ( error )
              {



                     await page.screenshot( { path: 'error-screenshot-final.png', fullPage: true } );
                     console.log( '📸 Capture d’écran final sauvegardée : error-screenshot.png' );


                     const objectToReturn = { niveauDeClick: niveauDeClick, erreur: error }
                     return objectToReturn;

              }







              try
              {

                     await page.click( 'button[data-uia="cta-order-final"]' );
                     niveauDeClick = 'click sur le btn order-final';


              } catch ( error )
              {

                     const objectToReturn = { niveauDeClick: niveauDeClick, erreur: error }
                     return objectToReturn;

              }


 




              niveauDeClick = 'fin';
              const result = await page.title(); // Récupérer le titre ou tout autre résultat pertinent
              //  await page.close();
              const objectToReturn = { val: result, text: 'valeur update' }
              return objectToReturn;
       }

       async closeBrowser()
       {
              //  await this.browser.close();
       }
}

module.exports = { PlaywrightService };
