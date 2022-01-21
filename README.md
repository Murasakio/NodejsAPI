# NodejsAPI
NodeJS api joka vastaa ansioluettelosivuni erinäisiin pyyntöihin. Käyttää Express sovelluskehystä.

	Vastaa seuraaviin polkuihin:
	
		/apod [GET]
		
			Palauttaa Nasan APOD apista päivän astronomiakuvan tiedot.
		
		/mail [POST]
			
			Vastaanottaa sähköpostiosoitteen ja viestin, lähettää nodemailerin avulla varmistusviestin ja itse viestin sisällön sekä sähköpostin minulle.
			
		/feedback [POST]
		
			Vastaanottaa arvosanat responsiivisuudelle, käytettävyydelle, ulkoasulla sekä sähköpostin ja valinnaisesti viestin. Lähettää tiedot tietokantaan.
			
		Recaptcha
		
			Kaikki post pyynnöt on suojattu recaptcha tarkistuksella. Jos palautettu pistemäärä recaptcha palvelusta on pienempi kuin 0.5 hylkää pyynnön.
