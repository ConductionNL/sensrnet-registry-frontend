import { Component, OnInit } from '@angular/core';
import { SearchComponentEvent } from 'generieke-geo-componenten-search';
import {
  FeatureCollectionForCoordinate, FeatureCollectionForLayer,
  MapComponentEvent,
  MapComponentEventTypes,
  MapService,
  SelectionService,
  MapComponentDrawTypes,
  DrawInteractionService
} from 'generieke-geo-componenten-map';
import { HttpClient } from '@angular/common/http';
import {
  FeatureInfoCollection,
  FeatureInfoComponentEvent,
  FeatureInfoComponentEventType,
} from 'generieke-geo-componenten-feature-info';
import { Subscription, Observable } from 'rxjs';
import { DataService } from '../services/data.service';
import { FormGroup, FormControl } from '@angular/forms';
import proj4 from 'proj4';
import GeoJSON, { GeoJSONFeature, GeoJSONPoint } from 'ol/format/GeoJSON';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Cluster } from 'ol/source';
import { Circle as CircleStyle, Style, Fill, Text, Icon } from 'ol/style';
import Stroke from 'ol/style/Stroke';
import Feature from 'ol/Feature';
import { ISensor } from '../model/bodies/sensor-body';
import GeometryType from 'ol/geom/GeometryType';
import Point from 'ol/geom/Point';
import { Theme, Dataset, DatasetTreeEvent } from 'generieke-geo-componenten-dataset-tree';
import { Router } from '@angular/router';
import { AuthenticationService } from '../services/authentication.service';
import { Owner } from '../model/owner';
import { TypeName } from '../model/bodies/sensorType-body';
import { EventType } from '../model/events/event-type';
import { environment } from 'src/environments/environment';

@Component({
  templateUrl: './viewer.component.html',
  styleUrls: ['./viewer.component.css'],
})
export class ViewerComponent implements OnInit {
  title = 'SensRNet'
  mapName = 'srn';

  types: any[];
  sensorTypes = TypeName;

  currentMapResolution: number = undefined;
  dataTabFeatureInfo: FeatureInfoCollection[];
  currentTabFeatureInfo: FeatureInfoCollection;
  drawSubscription: Subscription;
  activeDatasets: Dataset [] = [];
  activeWmtsDatasets: Dataset[] = [];
  activeWmsDatasets: Dataset[] = [];

  private vectorSource: VectorSource;
  private vectorLayer: VectorLayer;
  private clusterSource: Cluster;
  private location: [number, number];

  public registerOwnerSent = false;
  public registerSensorSent = false;

  private uniqueId = 0;

  RegisterSensor = new FormGroup({
    name: new FormControl(''),
    aim: new FormControl(''),
    description: new FormControl(''),
    manufacturer: new FormControl(''),
    active: new FormControl(''),
    documentation: new FormControl(''),
    location: new FormControl({}),
    typeName: new FormControl(''),
  });

  UpdateSensor = new FormGroup({
    name: new FormControl(''),
    aim: new FormControl(''),
    description: new FormControl(''),
    manufacturer: new FormControl(''),
    active: new FormControl(''),
    documentation: new FormControl(''),
    typeName: new FormControl(''),
    location: new FormControl('')
  });

  RegisterOwner = new FormGroup({
    companyName: new FormControl(''),
    email: new FormControl(''),
    name: new FormControl(''),
    publicName: new FormControl(''),
    website: new FormControl(''),
  });

  UpdateOwner = new FormGroup({
    organisation: new FormControl(''),
    website: new FormControl(''),
    contactPublic: new FormControl(''),
    contactPerson: new FormControl(''),
  });

  private epsgRD = '+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +units=m +no_defs'
  private epsgWGS84 = '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs'
  private mapCoordinateWGS84: [];
  private mapCoordinateRD: [];

  private sensors = [];

  currentOwner: Owner;

  myLayers: Theme[];
  hideTreeDataset = false;

  iconCollapsed = 'fas fa-chevron-right';
  iconExpanded = 'fas fa-chevron-left';
  iconUnchecked = 'far fa-square';
  iconChecked = 'far fa-check-square';
  iconInfoUrl = 'fas fa-info-circle';

  iconDir = '/assets/icons/'

  constructor(
    private router: Router,
    private authenticationService: AuthenticationService,
    private drawService: DrawInteractionService,
    private httpClient: HttpClient,
    public mapService: MapService,
    private selectionService: SelectionService,
    private dataService: DataService,
  ) {
    this.selectionService.getObservable(this.mapName).subscribe(this.handleSelectionServiceEvents.bind(this));
    this.authenticationService.currentOwner.subscribe(x => this.currentOwner = x);
  }

  ngOnInit(): void {
    this.httpClient.get('/assets/layers.json').subscribe(
      data => {
        this.myLayers = data as Theme[];
      },
      error => {
        // error
      }
    );

    this.types = Object.keys(this.sensorTypes).filter(String);

    this.dataService.connect();

    // subscribe to sensor events
    this.dataService.subscribeTo('Sensors').subscribe((sensors: Array<ISensor>) => {
      console.log(`Received ${sensors.length} sensors`);
      this.sensors = sensors;
      const featuresData: Array<object> = sensors.map((sensor) => this.sensorToFeature(sensor));

      const features: Array<Feature> = (new GeoJSON()).readFeatures({
        features: featuresData,
        type: 'FeatureCollection',
      });

      this.vectorSource = new VectorSource({
        features,
      });

      this.clusterSource = new Cluster({
        distance: 40,
        source: this.vectorSource
      });

      let styleCache = {}

      this.vectorLayer = new VectorLayer({
        source: this.clusterSource,
        // rewrite this function
        style: function (feature) {
          let numberOfFeatures = feature.get('features').length
          let style: Style

          // Define style
          if (numberOfFeatures === 1) {
            let active = feature.get('features')[0].values_.active
            let sensorType = feature.get('features')[0].values_.typeName[0]
            if (!active) {
              numberOfFeatures = 'inactive' + sensorType
              style = styleCache[numberOfFeatures]
            }
            else {
              numberOfFeatures = 'active' + sensorType
              style = styleCache[numberOfFeatures]
            }
          }
          else {
            style = styleCache[numberOfFeatures]
          }

          if (!style) {
            if (typeof numberOfFeatures === 'string') {
              let active = feature.get('features')[0].values_.active
              let sensorType = feature.get('features')[0].values_.typeName[0]
              console.log(sensorType)
              console.log(active)
              if (!active) {
                style = new Style({
                  image: new Icon({
                    opacity: 0.25,
                    scale: 0.35,
                    src: `/assets/icons/${sensorType}.png`,
                  })
                });
              }
              else {
                style = new Style({
                  image: new Icon({
                    opacity: 0.9,
                    scale: 0.35,
                    src: `/assets/icons/${sensorType}.png`,
                  })
                });
              }
            }
            else {
              style = new Style({
                image: new CircleStyle({
                  radius: 25,
                  stroke: new Stroke({
                    color: '#ffffff',
                    width: 3
                  }),
                  fill: new Fill({
                    color: 'rgba(19, 65, 115, 0.9)'
                  })
                }),
                text: new Text({
                  text: numberOfFeatures.toString(),
                  font: 'bold 11px "Helvetica Neue", Helvetica,Arial, sans-serif',
                  fill: new Fill({
                    color: '#ffffff'
                  }),
                  textAlign: 'center'
                })
              })
            }
            styleCache[numberOfFeatures] = style;
          }
          return style;
        }
      });

      this.vectorLayer.setZIndex(10);
      this.mapService.getMap(this.mapName).addLayer(this.vectorLayer);
    });

    // subscribe to sensor events
    const sensorCreated$: Observable<ISensor> = this.dataService.subscribeTo<ISensor>(EventType.SensorRegistered);
    sensorCreated$.subscribe((newSensor: ISensor) => {
      console.log(`Socket.io heard that a new SensorCreated event was fired`);
      console.log(newSensor);

      this.sensors.push(newSensor);

      const feature: object = this.sensorToFeature(newSensor);

      const newFeatures: Array<Feature> = (new GeoJSON()).readFeatures({
        features: [feature],
        type: 'FeatureCollection',
      });

      this.vectorSource.addFeatures(newFeatures);
    });
  }

  private sensorToFeature(newSensor: ISensor): object {
    return {
      geometry: {
        coordinates: proj4(this.epsgWGS84, this.epsgRD, [newSensor.location.coordinates[0], newSensor.location.coordinates[1]]),
        type: 'Point',
      },
      id: newSensor._id,
      properties: {
        active: newSensor.active,
        typeName: [newSensor.typeName]
      },
      type: 'Feature',
    };
  }

  startDrawPoint() {
    this.drawService.startDrawInteraction(MapComponentDrawTypes.POINT, this.mapName);
    this.subscribeOnDrawEvents();
  }

  private subscribeOnDrawEvents() {
    if (!this.drawSubscription) {
      const interactionEventObservable = this.drawService.drawEventsObservableMap.get(this.mapName);
      if (interactionEventObservable) {
        this.drawSubscription = interactionEventObservable.subscribe(evt => {
          console.log('DrawInteractionEvent: ' + evt.type + '; Type geometry: ' + evt.drawType);
          const locationRD = evt.event.feature.getGeometry().getFlatCoordinates();
          const locationWGS84 = proj4(this.epsgRD, this.epsgWGS84, locationRD);
          this.RegisterSensor.patchValue({
            location: {
              baseObjectId: 'IDK',
              height: 0,
              latitude: locationWGS84[1],
              longitude: locationWGS84[0],
            }
          });
        });
      }
    }
  }

  clearDrawing(mapIndex: string) {
    this.drawService.clearDrawInteraction(this.mapName);
  }

  clearFeatures(mapIndex: string) {
    this.drawService.clearDrawInteractionLayer(this.mapName);
  }

  handleEvent(event: SearchComponentEvent) {
    this.mapService.zoomToPdokResult(event, 'srn');
  }

  clearSelection(mapIndex: string) {
    this.selectionService.clearSelection(this.mapName);
  }

  setSelectionMode(selectionMode: string) {
    if (selectionMode === 'single') {
      this.selectionService.setSingleselectMode(this.mapName);
    } else if (selectionMode === 'multi') {
      this.selectionService.setMultiselectMode(this.mapName);
    }
  }

  handleSelectionServiceEvents(event: MapComponentEvent) {
    if (event.type === MapComponentEventTypes.SELECTIONSERVICE_MAPCLICKED) {
      // clear dataFeatureInfo on singleclick
      this.dataTabFeatureInfo = [];
      this.mapService.clearSelectionLayer(event.mapName);
    } else if (event.type === MapComponentEventTypes.SELECTIONSERVICE_SELECTIONUPDATED) {
      const result: FeatureCollectionForCoordinate = event.value;
      const featureinfoCollection: FeatureCollectionForLayer[] = result.featureCollectionForLayers;
      this.mapService.clearSelectionLayer(event.mapName);
      featureinfoCollection.forEach((featureinfo) => {
        this.mapService.addFeaturesToSelectionLayer(featureinfo.features, event.mapName);
      });
      this.dataTabFeatureInfo = [...featureinfoCollection];
    } else if (event.type === MapComponentEventTypes.SELECTIONSERVICE_CLEARSELECTION) {
      this.dataTabFeatureInfo = [];
      this.mapService.clearSelectionLayer(event.mapName);
    }
  }

  handleFeatureInfoEvent(event: FeatureInfoComponentEvent) {
    if (event.type === FeatureInfoComponentEventType.SELECTEDTAB) {
      this.currentTabFeatureInfo = event.value;
    }
  }

  handleMapEvents(mapEvent: MapComponentEvent) {
    if (mapEvent.type === MapComponentEventTypes.ZOOMEND) {
      this.currentMapResolution = this.mapService.getMap(this.mapName).getView().getResolution();
    }
    // create point from single map click (RD and WGS84)
    if (mapEvent.type === MapComponentEventTypes.SINGLECLICK) {
      this.mapCoordinateRD = mapEvent.value.coordinate
      console.log(this.mapCoordinateRD)
      this.mapCoordinateWGS84 = proj4(this.epsgRD, this.epsgWGS84, this.mapCoordinateRD)
      console.log(this.mapCoordinateWGS84)
    }
  }

  onFeatureInfoEvent(event: FeatureInfoComponentEvent) {
    if (event.type === FeatureInfoComponentEventType.SELECTEDTAB) {
      this.currentTabFeatureInfo = event.value;
    } else if (event.type === FeatureInfoComponentEventType.SELECTEDOBJECT) {
      this.mapService.clearHighlightLayer(this.mapName);
      if (event.value) { // er is een geselecteerd object
        this.mapService.addFeaturesToHighlightLayer([event.value], this.mapName);
      }
    }
  }

  handleDatasetTreeEvents(event: DatasetTreeEvent) {
    /*
     * Activeren en deactiveren van kaartlagen
     */
    if (event.type === 'layerActivated') {
      const geactiveerdeService = event.value.services[0];
      if (geactiveerdeService.type === 'wms') {
        this.activeWmsDatasets.push(event.value);
      } else if (geactiveerdeService.type === 'wmts') {
        this.activeWmtsDatasets.push(event.value);
      }
    } else if (event.type === 'layerDeactivated') {
      const gedeactiveerdeService = event.value.services[0];
      if (gedeactiveerdeService.type === 'wms') {
        this.activeWmsDatasets = this.activeWmsDatasets.filter(dataset =>
          dataset.services[0].layers[0].technicalName !== gedeactiveerdeService.layers[0].technicalName);
        this.activeWmsDatasets = this.activeWmsDatasets.filter(dataset => dataset.services.length > 0);
      } else if (gedeactiveerdeService.type === 'wmts') {
        this.activeWmtsDatasets = this.activeWmtsDatasets.filter(dataset =>
          dataset.services[0].layers[0].technicalName !== gedeactiveerdeService.layers[0].technicalName);
        this.activeWmtsDatasets = this.activeWmtsDatasets.filter(dataset => dataset.services.length > 0);
      }
    }
  }

  submitCreateSensor() {
    this.drawService.stopDrawInteraction(this.mapName);
    console.warn(this.RegisterSensor.value);
    const sensor: object = {
      active: this.RegisterSensor.value.active || false,
      aim: this.RegisterSensor.value.aim,
      description: this.RegisterSensor.value.description,
      documentation: this.RegisterSensor.value.documentation,
      location: this.RegisterSensor.value.location || { x: 0, y: 0, z: 0 },
      manufacturer: this.RegisterSensor.value.manufacturer,
      name: this.RegisterSensor.value.name,
      dataStreams: this.RegisterSensor.value.dataStreams || [],
      typeName: this.RegisterSensor.value.typeName || [],
    };

    this.httpClient.post(`${environment.apiUrl}/Sensor`, sensor, {}).subscribe((data: any) => {
      console.log(`Sensor was succesfully posted, received id ${data.sensorId}`);

      this.registerSensorSent = true;
      setTimeout(() => {
        this.registerSensorSent = false;
      }, 2500);
    }, err => {
      console.log(err);
    });
  }

  submitCreateOwner() {
    console.log('Create owner');

    console.warn(this.RegisterOwner.value);
    const owner: object = {
      companyName: this.RegisterOwner.value.companyName,
      email: this.RegisterOwner.value.email,
      name: this.RegisterOwner.value.name,
      publicName: this.RegisterOwner.value.publicName,
      ssoId: 'local',
      website: this.RegisterOwner.value.website,
    };

    this.httpClient.post(`${environment.apiUrl}/Owner`, owner, {}).subscribe((data: any) => {
      console.log(`Owner was succesfully posted, received id ${data.ownerId}`);

      this.registerOwnerSent = true;
      setTimeout(() => {
        this.registerOwnerSent = false;
      }, 2500);
    }, err => {
      console.log(err);
    });
  }

  logout() {
    this.authenticationService.logout();
    this.router.navigate(['/login']);
}
};
