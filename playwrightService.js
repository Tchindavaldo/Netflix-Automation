// PlaywrightService.js
const { chromium } = require( 'playwright' );
let niveauDeClick = 'initialisation';


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




              console.log( "execution du click suivant" );
              await page.click( 'button[data-uia="continue-button"]' );


              console.log( "execution du click suivant 2" );





              // await page.click( '#describe-5200' );
              // await page.click( '#describe-3088' );
              // await page.click( '#describe-3108' );



              // `label[data-uia="plan-selection+option+${ planId }"]`
              await page.click( 'label[data-uia="plan-selection+option+4001"]' );
              await page.click( 'label[data-uia="plan-selection+option+4120"]' );
              await page.click( 'label[data-uia="plan-selection+option+3088"]' );







              await page.click( 'button[data-uia="cta-plan-selection"]' );




              await page.click( 'button[data-uia="cta-continue-registration"]' );

              // await page.waitForTimeout( 5000 );

              await page.fill( 'input[data-uia="field-email"]', data.email );

              // Remplir le champ mot de passe
              await page.fill( 'input[data-uia="field-password"]', data.password );


              // const objectToReturn2 = { val: 'test backend OK', text: 'valeur update' }
              // return objectToReturn2;


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




              const checkboxTermsOfUse = page.locator( 'input[data-uia="field-hasAcceptedTermsOfUse"]' );
              await checkboxTermsOfUse.check( { force: true } );


              // click sur le btn start MemberShip
              try
              {

                     niveauDeClick = 'click sur le btn start MemberShip';
                     await page.click( 'button[data-uia="action-submit-payment"]' );


                     try
                     {
                            // Attendre soit l'erreur soit la navigation
                            await page.waitForSelector( '[data-uia="UIMessage-content"]', { timeout: 10000 } );


                            // Récupérer le texte d'erreur
                            const errorText = await page.locator( '[data-uia="UIMessage-content"] span[data-uia=""]' ).innerText();

                            return {

                                   success: false,
                                   error: errorText,
                                   niveauDeClick: 'après action-submit-payment',
                                   details: 'Erreur de paiement détectée'

                            };

                     } catch ( error ) { console.log( "erreur détectée", error ); }


              } catch ( error )
              {

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





              // const checkboxTermsOfUse = page.locator( 'input[data-uia="field-emailPreference"]' );
              // await checkboxTermsOfUse.waitFor( { state: 'visible' } );
              // console.log( 'checkboxTermsOfUse found:', await checkboxTermsOfUse.count() ); // Devrait afficher "1" si l'élément est trouvé

              // const isDisabled = await checkboxTermsOfUse.isDisabled();
              // console.log( 'checkboxTermsOfUse is disabled:', isDisabled );



              // await checkboxTermsOfUse.click( { force: true } );
              // console.log( 'Case cochée avec un clic forcé' );

              // if ( isDisabled )
              // {
              //        throw new Error( "La case à cocher n'est pas activable" );
              // }



              // await page.check( 'input#cb_rightOfWithdrawal' );
              // const checkbox2 = page.locator( '#cb_rightOfWithdrawal' ); // ou page.locator('[data-uia="field-consents+rightOfWithdrawal"]')







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
