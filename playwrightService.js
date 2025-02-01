// PlaywrightService.js
const { chromium } = require( 'playwright' );

class PlaywrightService
{
       constructor()
       {
              this.initBrowser();
       }

       async initBrowser()
       {
              // this.browser = await chromium.launch( { headless: false } );
              this.browser = await chromium.launch( {
                     // executablePath: '/usr/bin/chromium', // Vérifie si ce chemin fonctionne, sinon essaie '/usr/bin/google-chrome'
                     headless: true // Important pour Render
              } );;
       }

       async fillForm( url, data ) 
       {

              const page = await this.browser.newPage();
              await page.setDefaultTimeout( 60000 ); // Définit un timeout global de 60 secondes

              await page.goto( url );
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


              // Exemple d'interactions pour remplir les formulaires
              // await page.fill('input[name="username"]', data.username);
              // await page.fill('input[name="password"]', data.password);
              // await page.click('button[type="submit"]');

              // await page.waitForTimeout(5000);

              // Cliquez sur le bouton ayant le sélecteur correspondant

              // Vérifiez périodiquement la visibilité du bouton avec un log
              // let isButtonVisible = false;
              // while ( !isButtonVisible )
              // {
              //        try
              //        {
              //               isButtonVisible = await page.evaluate( () =>
              //               {
              //                      const btn = document.querySelector( 'button[data-uia="continue-button"]' );
              //                      return btn && btn.offsetParent !== null; // Vérifie que le bouton est visible
              //               } );

              //               if ( isButtonVisible )
              //               {
              //                      console.log( "Le bouton est maintenant visible !" );
              //                      break;
              //               } else
              //               {
              //                      console.log( "Le bouton n'est pas encore visible, on attend..." );
              //               }
              //        } catch ( err )
              //        {
              //               console.log( "Erreur lors de la vérification du bouton :", err );
              //        }

              //        // Attendez un court instant avant de réessayer
              //        await page.waitForTimeout( 500 );
              // }

              // // Cliquez sur le bouton après qu'il soit visible
              // await page.click( 'button[data-uia="continue-button"]' );
              // console.log( "Le clic sur le bouton a été effectué !" );

              await page.click( 'button[data-uia="continue-button"]' );






              await page.click( '#describe-5200' );
              await page.click( '#describe-3088' );
              await page.click( '#describe-3108' );







              await page.click( 'button[data-uia="cta-plan-selection"]' );




              await page.click( 'button[data-uia="cta-continue-registration"]' );

              // await page.waitForTimeout( 5000 );

              await page.fill( 'input[data-uia="field-email"]', data.email );

              // Remplir le champ mot de passe
              await page.fill( 'input[data-uia="field-password"]', data.password );



              // await page.waitForTimeout( 5000 );


              const checkbox = page.locator( 'input[data-uia="field-emailPreference"]' );
              await checkbox.waitFor( { state: 'visible' } );
              console.log( 'Checkbox found:', await checkbox.count() ); // Devrait afficher "1" si l'élément est trouvé

              const isDisabled = await checkbox.isDisabled();
              console.log( 'Checkbox is disabled:', isDisabled );



              await checkbox.click( { force: true } );
              console.log( 'Case cochée avec un clic forcé' );

              if ( isDisabled )
              {
                     throw new Error( "La case à cocher n'est pas activable" );
              }



              // await page.waitForTimeout( 5000 );
              await page.click( 'button[data-uia="cta-registration"]' );
              await page.click( '#creditOrDebitCardDisplayStringId' )
              console.log( 'Clic forcé sur la case effectué avec succès.' );




              // Remplir les champs pour les informations de carte de crédit
              console.log( "Début du remplissage des champs du formulaire de carte de crédit..." );


              await page.click( 'input#cb_rightOfWithdrawal', { force: true } );
              // await page.check( 'input#cb_rightOfWithdrawal' );
              // const checkbox2 = page.locator( '#cb_rightOfWithdrawal' ); // ou page.locator('[data-uia="field-consents+rightOfWithdrawal"]')



              // // Cocher la checkbox2
              // await checkbox2.check();


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


              await page.click( 'button[data-uia="action-submit-payment"]' );


              // nameOnCard
              await page.fill( 'input[data-uia="phone-number+phoneNumber"]', data.number );
              console.log( "nom remplir :", data.number );




              await page.locator( '#cb_rightOfWithdrawal' ).check( { force: true } );


              await page.click( 'button[data-uia="cta-order-final"]' );



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
