import { Component } from '@angular/core';
import { ActionSheetController, Platform } from '@ionic/angular';
import { Camera, CameraOptions } from '@ionic-native/camera/ngx';
import Tesseract from 'tesseract.js';
// import { SummaryService } from '../api/summary.service';
import * as Fin from "finnlp";
import Names from '../../names-dataset/human_names.json';
import Cities from '../../names-dataset/city_names.json';
import { Contacts, Contact, ContactField, ContactName } from '@ionic-native/contacts';
import { ToastController } from '@ionic/angular';
import { AdMobFree, AdMobFreeBannerConfig } from '@ionic-native/admob-free/ngx';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  logo:string = '../../assets/logo/LogoFinal.png';
  cerebLogo:string = '../../assets/logo/cereb-logo.png';
  cameraIcon:string = '../../assets/icon/camera1.svg'
  selectedImage: string;
  namefound: string = '';
  isnamefound: boolean = false;
  phonenumber1: string = '';
  isphone1found: boolean = false;
  phonenumber2: string = '';
  isphone2found: boolean = false;
  emailfound: string = '';
  isemailfound: boolean = false;
  addressfound: string = '';
  isaddressfound: boolean = false;
  
  loaderToShow: any;
  ToasterToShow: any;
  loading: boolean = false;

  tips = [
    'Either you can choose image from Photo Gallery or you can capture it from camera',
    'Make sure you are selecting clear image to process',
    'Using flash and autofoucs will help to read more accurate information',
    'Crop the exact area of text while selection to be more accurate'
  ];

  constructor(private camera: Camera, 
              private actionSheetCtrl: ActionSheetController, 
              private contacts: Contacts,
              public toastCtrl: ToastController,
              public platform: Platform,
              public admobFree: AdMobFree
              ) {
              //this.readImage()
              this.showBanner();
  }

  async selectSource() {
    //this.showLoader();
    const cameraOptions: CameraOptions = {
      quality: 100,
      allowEdit: true,
      correctOrientation: true,
      saveToPhotoAlbum: false,
      destinationType: this.camera.DestinationType.DATA_URL,
      encodingType: this.camera.EncodingType.JPEG,
      mediaType: this.camera.MediaType.PICTURE,
      sourceType: this.camera.PictureSourceType.CAMERA
    }

    const galleryOptions: CameraOptions = {
      quality: 100,
      allowEdit: true,
      correctOrientation: true,
      saveToPhotoAlbum: false,      
      destinationType: this.camera.DestinationType.DATA_URL,
      encodingType: this.camera.EncodingType.JPEG,
      mediaType: this.camera.MediaType.PICTURE,
      sourceType: this.camera.PictureSourceType.PHOTOLIBRARY
    }

    const actionSheet = await this.actionSheetCtrl.create({
      buttons: [
        {
          text: 'Open Gallery',
          handler: () => {
            this.camera.getPicture(galleryOptions).then((imageData) => {
              this.selectedImage = imageData;
              this.readImage()
              //this.hideLoader();
            },(err) => {
              //this.hideLoader();
            });
          }
        }, {
          text: 'Use Camera',
          handler: () => {
            this.camera.getPicture(cameraOptions).then((imageData) => {
              this.selectedImage = imageData;
              this.readImage()
              //this.hideLoader();
             }, (err) => {
              // Handle error
              //this.hideLoader();
             });
          }
        }
      ]
   });
   await actionSheet.present(); 
  }

  readImage(){
    this.showLoader();
    const { TesseractWorker, OEM } = Tesseract;
    const worker = new TesseractWorker();
    //this.selectedImage = '../../assets/test1.jpg';
    this.selectedImage = 'data:image/jpeg;base64,' + this.selectedImage
    worker.recognize(this.selectedImage, 'eng',{'tessedit_ocr_engine_mode': OEM.TESSERACT_ONLY}) //,{'tessedit_ocr_engine_mode': OEM.TESSERACT_ONLY}
    .progress((p) => {
      console.log(p.status);
    })
    .then(({ text }) => {
      let phoneNumbersFound = this.validatePhone(text);
      let addressDetails = this.processAddress(text)
      let emailIdsFound = this.validateEmail(text);
      let processed = new Fin.Run(text);
      let getNouns = [];
      let cities = []
      let self = this;
      processed.sentences.map((sentence) => {
        sentence.tags.map(function(a,b){
          let tempname = self.titleCase(sentence.tokens[b])
          if(Names[tempname] && getNouns.length < 2)
            getNouns.push(tempname);

          if(Cities[tempname]){
            cities.push(tempname)
            self.processAddress(sentence)
          }
        });
      });

      if(getNouns.length>0){
        let tempNames = getNouns ? getNouns.join(" ") : ""
        this.namefound = tempNames
        this.isnamefound = true;
      }
      else {
        this.isnamefound = false;
      }

      
      if(phoneNumbersFound){
        if(phoneNumbersFound.length>0) {
          this.isphone1found = true;
          this.phonenumber1 = phoneNumbersFound[0]
          if(phoneNumbersFound.length>1) {
            this.isphone2found = true;
            this.phonenumber2 = phoneNumbersFound[1]
          } else {
            this.isphone2found = false;
          }
        } else {
          this.isphone1found = false;
        }
      }

      if(emailIdsFound){
        if(emailIdsFound.length>0) {
          this.emailfound = emailIdsFound[0]
          this.isemailfound = true;
        } else {
          this.isemailfound = false;
        }
      }
      this.addressfound = addressDetails ? addressDetails.join() : null
      worker.terminate();
      this.hideLoader();
    },
    (err) => {
      this.hideLoader();
    });
  }

  saveContact() {
    this.showLoader();
    let contact: Contact = this.contacts.create();
    let firstName = "";
    let lastName = "";
    let phone1 = "";
    let phone2 = "";
    let contactname = this.namefound.split(' ')
    if(contactname.length > 1){
      firstName = contactname[0];
      if(contactname[1]){
        lastName = contactname[1];
      }
    }
    else {
      if(contactname.length > 0)
        firstName = contactname["names"][0];
    }
    
    phone1 = this.phonenumber1;
    phone2 = this.phonenumber2;

    contact.name = new ContactName(null, lastName, firstName);
    contact.phoneNumbers = [new ContactField('mobile', phone1), new ContactField('mobile', phone2)];
    //let profilePic = new ContactField('base64', this.selectedImage, true) // , true
    //contact.photos.push(profilePic);
    contact.emails = [new ContactField('email', this.emailfound)]
      
    contact.save().then(
      () => {
        this.showToaster('Contact saved');
        this.hideLoader();
      },
      (error: any) => {
        this.showToaster(error);
        this.hideLoader();
      }
    );
  }

  refresh() {
    this.selectedImage = "";
    this.namefound = '';
    this.phonenumber1 = '';
    this.phonenumber2 = '';
    this.emailfound = '';
    this.addressfound = '';
  }

  validateEmail = (email) => {
    let re = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;
    return email.match(re);
  }

  processAddress = (rawAddress) => {
    let re = /.*(?<=,).*/g;
    //console.log(rawAddress)
    return String(rawAddress).match(re);
  }

  validatePhone = (phone) => {
    let re = /(?:\+ *)?\d[\d\- ]{7,}/g;
    return phone.match(re);
  }  

  showLoader() {
    this.loading = true;    
  }
 
  hideLoader() {
    this.loading = false;
  }

  showToaster(msg: string = '') {
    this.ToasterToShow = this.toastCtrl.create({
      message: msg,
      duration: 2000
    }).then((res) => {
      res.present();
    });
  }
 
  /*hideToaster() {
    this.toastCtrl.dismiss();
  }*/

  titleCase = (str) => {
    str = str.toLowerCase();
    str = str.split(' ');
    for (var i = 0; i < str.length; i++) {
      str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1); 
    }
    return str.join(' ');
  }

  /*openMapsApp() {
    let location = 'michigan';//this.finalOutputJSON["city"]
    if (this.platform.is('android')) {
      window.location.href = 'geo:' + location;
    } else {
      window.location.href = 'maps://maps.apple.com/?q=' + location;
    }
  }*/

  closeApplication() {
    navigator['app'].exitApp();
  }

  showBanner() {
    const bannerConfig: AdMobFreeBannerConfig = {
      // add your config here
      // for the sake of this example we will just use the test config
      isTesting: false,
      autoShow: true
     };
    this.admobFree.banner.config(bannerConfig);
    
    this.admobFree.banner.prepare()
      .then(() => {
        // banner Ad is ready
        // if we set autoShow to false, then we will need to call the show method here
      })
      .catch(e => console.log(e));    
  }  
}
