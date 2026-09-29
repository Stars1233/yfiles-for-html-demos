/****************************************************************************
 ** @license
 ** This demo file is part of yFiles for HTML.
 ** Copyright (c) 2026 by yWorks GmbH, Vor dem Kreuzberg 28,
 ** 72070 Tuebingen, Germany. All rights reserved.
 **
 ** yFiles demo files exhibit yFiles for HTML functionalities. Any redistribution
 ** of demo files in source code or binary form, with or without
 ** modification, is not permitted.
 **
 ** Owners of a valid software license for a yFiles for HTML version that this
 ** demo is shipped with are allowed to use the demo source code as basis
 ** for their own yFiles for HTML powered applications. Use of such programs is
 ** governed by the rights and conditions as set out in the yFiles for HTML
 ** license agreement.
 **
 ** THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESS OR IMPLIED
 ** WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 ** MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN
 ** NO EVENT SHALL yWorks BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 ** SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 ** TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 ** PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 ** LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 ** NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 ** SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 **
 ***************************************************************************/
//
// The JSON model data for the organization chart example.
// Class TreeSource automatically creates
// a yFiles graph model from this data.
//
export default [
  {
    position: 'Chief Executive Officer',
    name: 'Eric Joplin',
    email: 'ejoplin@yoyodyne.com',
    phone: '555-0100',
    businessUnit: 'Executive Unit',
    status: 'present',
    icon: 'usericon_male1',
    subordinates: [
      'groberts@yoyodyne.com',
      'akain@yoyodyne.com',
      'rfuller@yoyodyne.com',
      'mshark@yoyodyne.com',
      'ahaase@yoyodyne.com',
      'dkerry@yoyodyne.com'
    ]
  },
  {
    position: 'Chief Financial Officer',
    name: 'David Kerry',
    email: 'dkerry@yoyodyne.com',
    phone: '555-0180',
    businessUnit: 'Accounting',
    status: 'present',
    icon: 'usericon_male1',
    subordinates: ['whastings@yoyodyne.com', 'jmedico@yoyodyne.com', 'dwelch@yoyodyne.com']
  },
  {
    position: 'Human Resource Manager',
    name: 'Danny Welch',
    email: 'dwelch@yoyodyne.com',
    phone: '555-0198',
    businessUnit: 'Accounting',
    status: 'present',
    icon: 'usericon_male1',
    subordinates: ['lvison@yoyodyne.com', 'mparks@yoyodyne.com', 'llenhart@yoyodyne.com']
  },
  {
    position: 'Recruiter',
    name: 'Linda Lenhart',
    email: 'llenhart@yoyodyne.com',
    phone: '555-0204',
    businessUnit: 'Accounting',
    status: 'busy',
    icon: 'usericon_female1'
  },
  {
    position: 'Benefits Specialist',
    name: 'Mark Parks',
    email: 'mparks@yoyodyne.com',
    phone: '555-0202',
    businessUnit: 'Accounting',
    status: 'present',
    icon: 'usericon_male5'
  },
  {
    position: 'Human Resource Administrative Assistant',
    name: 'Leroy Vison',
    email: 'lvison@yoyodyne.com',
    phone: '555-0200',
    businessUnit: 'Accounting',
    status: 'present',
    icon: 'usericon_male2',
    assistant: true
  },
  {
    position: 'Finance Manager',
    name: 'Joy Medico',
    email: 'jmedico@yoyodyne.com',
    phone: '555-0190',
    businessUnit: 'Accounting',
    status: 'present',
    icon: 'usericon_female3',
    subordinates: ['elewis@yoyodyne.com', 'mbean@yoyodyne.com', 'rlindley@yoyodyne.com']
  },
  {
    position: 'Buyer',
    name: 'Raymond Lindley',
    email: 'rlindley@yoyodyne.com',
    phone: '555-0196',
    businessUnit: 'Accounting',
    status: 'present',
    icon: 'usericon_male3'
  },
  {
    position: 'Purchasing Assistant',
    name: 'Mildred Bean',
    email: 'mbean@yoyodyne.com',
    phone: '555-0194',
    businessUnit: 'Accounting',
    status: 'busy',
    icon: 'usericon_female5',
    assistant: true
  },
  {
    position: 'Purchasing Manager',
    name: 'Edward Lewis',
    email: 'elewis@yoyodyne.com',
    phone: '555-0192',
    businessUnit: 'Accounting',
    status: 'unavailable',
    icon: 'usericon_male1'
  },
  {
    position: 'Accounts Manager',
    name: 'Walter Hastings',
    email: 'whastings@yoyodyne.com',
    phone: '555-0182',
    businessUnit: 'Accounting',
    status: 'present',
    icon: 'usericon_male4',
    subordinates: ['smoran@yoyodyne.com', 'mcruz@yoyodyne.com', 'rking@yoyodyne.com']
  },
  {
    position: 'Accounts Payable Specialist',
    name: 'Rachel King',
    email: 'rking@yoyodyne.com',
    phone: '555-0188',
    businessUnit: 'Accounting',
    status: 'present',
    icon: 'usericon_female2'
  },
  {
    position: 'Accountant',
    name: 'Melvin Cruz',
    email: 'mcruz@yoyodyne.com',
    phone: '555-0186',
    businessUnit: 'Accounting',
    status: 'present',
    icon: 'usericon_male1'
  },
  {
    position: 'Accounts Receivable Specialist',
    name: 'Susan Moran',
    email: 'smoran@yoyodyne.com',
    phone: '555-0184',
    businessUnit: 'Accounting',
    status: 'present',
    icon: 'usericon_female3'
  },
  {
    position: 'Marketing Manager',
    name: 'Angela Haase',
    email: 'ahaase@yoyodyne.com',
    phone: '555-0170',
    businessUnit: 'Marketing',
    status: 'present',
    icon: 'usericon_female1',
    subordinates: ['jstewart@yoyodyne.com', 'ldeaton@yoyodyne.com']
  },
  {
    position: 'Marketing Assistant',
    name: 'Lorraine Deaton',
    email: 'ldeaton@yoyodyne.com',
    phone: '555-0174',
    businessUnit: 'Marketing',
    status: 'present',
    icon: 'usericon_female3',
    assistant: true
  },
  {
    position: 'Marketing Specialist',
    name: 'Jermaine Stewart',
    email: 'jstewart@yoyodyne.com',
    phone: '555-0172',
    businessUnit: 'Marketing',
    status: 'present',
    icon: 'usericon_male2'
  },
  {
    position: 'Vice President of Engineering',
    name: 'Mildred Shark',
    email: 'mshark@yoyodyne.com',
    phone: '555-0156',
    businessUnit: 'Engineering',
    status: 'present',
    icon: 'usericon_female2',
    subordinates: ['mbarnes@yoyodyne.com']
  },
  {
    position: 'Engineering Manager',
    name: 'Martha Barnes',
    email: 'mbarnes@yoyodyne.com',
    phone: '555-0158',
    businessUnit: 'Engineering',
    status: 'busy',
    icon: 'usericon_female3',
    subordinates: ['mdossantos@yoyodyne.com', 'laitken@yoyodyne.com', 'jpayne@yoyodyne.com']
  },
  {
    position: 'R & D Manager',
    name: 'John Payne',
    email: 'jpayne@yoyodyne.com',
    phone: '555-0168',
    businessUnit: 'Engineering',
    status: 'present',
    icon: 'usericon_male2',
    subordinates: [
      'roxborough@yoyodyne.com',
      'golsen@yoyodyne.com',
      'mfinney@yoyodyne.com',
      'jkelly@yoyodyne.com',
      'cwylam@yoyodyne.com',
      'sdotter@yoyodyne.com',
      'rbradshaw@yoyodyne.com',
      'vshoe@yoyodyne.com',
      'mtucker@yoyodyne.com',
      'dlong@yoyodyne.com',
      'arice@yoyodyne.com',
      'jlewis@yoyodyne.com',
      'sreid@yoyodyne.com'
    ]
  },
  {
    position: 'R & D Engineer',
    name: 'Susan Reid',
    email: 'sreid@yoyodyne.com',
    phone: '555-0226',
    businessUnit: 'Engineering',
    status: 'present',
    icon: 'usericon_female3'
  },
  {
    position: 'R & D Engineer',
    name: 'Joseph Lewis',
    email: 'jlewis@yoyodyne.com',
    phone: '555-0224',
    businessUnit: 'Engineering',
    status: 'present',
    icon: 'usericon_male2'
  },
  {
    position: 'R & D Engineer',
    name: 'Anthony Rice',
    email: 'arice@yoyodyne.com',
    phone: '555-0222',
    businessUnit: 'Engineering',
    status: 'busy',
    icon: 'usericon_male1'
  },
  {
    position: 'R & D Engineer',
    name: 'Dennis Long',
    email: 'dlong@yoyodyne.com',
    phone: '555-0232',
    businessUnit: 'Engineering',
    status: 'present',
    icon: 'usericon_male3'
  },
  {
    position: 'R & D Engineer',
    name: 'Marty Tucker',
    email: 'mtucker@yoyodyne.com',
    phone: '555-0230',
    businessUnit: 'Engineering',
    status: 'present',
    icon: 'usericon_male2'
  },
  {
    position: 'R & D Engineer',
    name: 'Vera Shoe',
    email: 'vshoe@yoyodyne.com',
    phone: '555-0218',
    businessUnit: 'Engineering',
    status: 'present',
    icon: 'usericon_female1'
  },
  {
    position: 'R & D Engineer',
    name: 'Richard Bradshaw',
    email: 'rbradshaw@yoyodyne.com',
    phone: '555-0216',
    businessUnit: 'Engineering',
    status: 'unavailable',
    icon: 'usericon_male5'
  },
  {
    position: 'R & D Engineer',
    name: 'Steven Dotter',
    email: 'sdotter@yoyodyne.com',
    phone: '555-0214',
    businessUnit: 'Engineering',
    status: 'busy',
    icon: 'usericon_male2'
  },
  {
    position: 'R & D Engineer',
    name: 'Charles Wylam',
    email: 'cwylam@yoyodyne.com',
    phone: '555-0212',
    businessUnit: 'Engineering',
    status: 'present',
    icon: 'usericon_male1'
  },
  {
    position: 'R & D Engineer',
    name: 'Julius Kelly',
    email: 'jkelly@yoyodyne.com',
    phone: '555-0208',
    businessUnit: 'Engineering',
    status: 'present',
    icon: 'usericon_male3'
  },
  {
    position: 'R & D Engineer',
    name: 'Matthew Finney',
    email: 'mfinney@yoyodyne.com',
    phone: '555-0206',
    businessUnit: 'Engineering',
    status: 'busy',
    icon: 'usericon_male2'
  },
  {
    position: 'R & D Engineer',
    name: 'Gary Olsen',
    email: 'golsen@yoyodyne.com',
    phone: '555-0178',
    businessUnit: 'Engineering',
    status: 'present',
    icon: 'usericon_male1'
  },
  {
    position: 'R & D Engineer',
    name: 'Rana Oxborough',
    email: 'roxborough@yoyodyne.com',
    phone: '555-0176',
    businessUnit: 'Engineering',
    status: 'present',
    icon: 'usericon_female4'
  },
  {
    position: 'Senior Design Engineer',
    name: 'Laurie Aitken',
    email: 'laitken@yoyodyne.com',
    phone: '555-0164',
    businessUnit: 'Engineering',
    status: 'present',
    icon: 'usericon_female2',
    subordinates: [
      'cclark@yoyodyne.com',
      'cjudd@yoyodyne.com',
      'rfinn@yoyodyne.com',
      'wschaub@yoyodyne.com',
      'enagy@yoyodyne.com'
    ]
  },
  {
    position: 'Design Engineer',
    name: 'Edwin Nagy',
    email: 'enagy@yoyodyne.com',
    phone: '555-0166',
    businessUnit: 'Engineering',
    status: 'present',
    icon: 'usericon_male1'
  },
  {
    position: 'Design Engineer',
    name: 'Willie Schaub',
    email: 'wschaub@yoyodyne.com',
    phone: '555-0248',
    businessUnit: 'Engineering',
    status: 'present',
    icon: 'usericon_male3'
  },
  {
    position: 'Design Engineer',
    name: 'Robert Finn',
    email: 'rfinn@yoyodyne.com',
    phone: '555-0246',
    businessUnit: 'Engineering',
    status: 'present',
    icon: 'usericon_male2'
  },
  {
    position: 'Design Engineer',
    name: 'Cynthia Judd',
    email: 'cjudd@yoyodyne.com',
    phone: '555-0244',
    businessUnit: 'Engineering',
    status: 'unavailable',
    icon: 'usericon_female1'
  },
  {
    position: 'Design Engineer',
    name: 'Carla Clark',
    email: 'cclark@yoyodyne.com',
    phone: '555-0242',
    businessUnit: 'Engineering',
    status: 'unavailable',
    icon: 'usericon_female3'
  },
  {
    position: 'Senior Tool Designer',
    name: 'Maria Dossantos',
    email: 'mdossantos@yoyodyne.com',
    phone: '555-0160',
    businessUnit: 'Engineering',
    status: 'present',
    icon: 'usericon_female1',
    subordinates: [
      'hdonald@yoyodyne.com',
      'mdouglas@yoyodyne.com',
      'bpenney@yoyodyne.com',
      'fwebster@yoyodyne.com',
      'garnold@yoyodyne.com',
      'kkowalski@yoyodyne.com'
    ]
  },
  {
    position: 'Tool Designer',
    name: 'Ken Kowalski',
    email: 'kkowalski@yoyodyne.com',
    phone: '555-0240',
    businessUnit: 'Engineering',
    status: 'present',
    icon: 'usericon_male1'
  },
  {
    position: 'Tool Designer',
    name: 'Gregory Arnold',
    email: 'garnold@yoyodyne.com',
    phone: '555-0238',
    businessUnit: 'Engineering',
    status: 'present',
    icon: 'usericon_male3'
  },
  {
    position: 'Tool Designer',
    name: 'Francis Webster',
    email: 'fwebster@yoyodyne.com',
    phone: '555-0236',
    businessUnit: 'Engineering',
    status: 'present',
    icon: 'usericon_male4'
  },
  {
    position: 'Tool Designer',
    name: 'Bonnie Penney',
    email: 'bpenney@yoyodyne.com',
    phone: '555-0234',
    businessUnit: 'Engineering',
    status: 'present',
    icon: 'usericon_female4'
  },
  {
    position: 'Tool Designer',
    name: 'Michelle Douglas',
    email: 'mdouglas@yoyodyne.com',
    phone: '555-0228',
    businessUnit: 'Engineering',
    status: 'present',
    icon: 'usericon_female5'
  },
  {
    position: 'Tool Designer',
    name: 'Hector Donald',
    email: 'hdonald@yoyodyne.com',
    phone: '555-0162',
    businessUnit: 'Engineering',
    status: 'busy',
    icon: 'usericon_male2'
  },
  {
    position: 'Vice President of Sales',
    name: 'Richard Fuller',
    email: 'rfuller@yoyodyne.com',
    phone: '555-0134',
    businessUnit: 'Sales',
    status: 'present',
    icon: 'usericon_male1',
    subordinates: ['jvargas@yoyodyne.com', 'rhartman@yoyodyne.com']
  },
  {
    position: 'European Sales Manager',
    name: 'Robert Hartman',
    email: 'rhartman@yoyodyne.com',
    phone: '555-0138',
    businessUnit: 'Sales',
    status: 'present',
    icon: 'usericon_male5',
    subordinates: ['rpolite@yoyodyne.com', 'mdaniels@yoyodyne.com']
  },
  {
    position: 'Sales Representative',
    name: 'Michael Daniels',
    email: 'mdaniels@yoyodyne.com',
    phone: '555-0154',
    businessUnit: 'Sales',
    status: 'busy',
    icon: 'usericon_male1'
  },
  {
    position: 'Sales Representative',
    name: 'Rebecca Polite',
    email: 'rpolite@yoyodyne.com',
    phone: '555-0148',
    businessUnit: 'Sales',
    status: 'busy',
    icon: 'usericon_female3'
  },
  {
    position: 'North America Sales Manager',
    name: 'Joe Vargas',
    email: 'jvargas@yoyodyne.com',
    phone: '555-0136',
    businessUnit: 'Sales',
    status: 'present',
    icon: 'usericon_male2',
    subordinates: ['rparson@yoyodyne.com', 'mnoren@yoyodyne.com']
  },
  {
    position: 'Sales Representative',
    name: 'Melissa Noren',
    email: 'mnoren@yoyodyne.com',
    phone: '555-0152',
    businessUnit: 'Sales',
    status: 'present',
    icon: 'usericon_female1'
  },
  {
    position: 'Sales Representative',
    name: 'Robert Parson',
    email: 'rparson@yoyodyne.com',
    phone: '555-0150',
    businessUnit: 'Sales',
    status: 'busy',
    icon: 'usericon_male3'
  },
  {
    position: 'Vice President of Production',
    name: 'Amy Kain',
    email: 'akain@yoyodyne.com',
    phone: '555-0106',
    businessUnit: 'Production',
    status: 'unavailable',
    icon: 'usericon_female2',
    subordinates: [
      'dturner@yoyodyne.com',
      'llittlefield@yoyodyne.com',
      'abinger@yoyodyne.com',
      'rhammond@yoyodyne.com',
      'kmaxwell@yoyodyne.com'
    ]
  },
  {
    position: 'Production Supervisor',
    name: 'Kathy Maxwell',
    email: 'kmaxwell@yoyodyne.com',
    phone: '555-0132',
    businessUnit: 'Production',
    status: 'present',
    icon: 'usericon_female3'
  },
  {
    position: 'Shipping and Receiving Supervisor',
    name: 'Ray Hammond',
    email: 'rhammond@yoyodyne.com',
    phone: '555-0146',
    businessUnit: 'Production',
    status: 'busy',
    icon: 'usericon_male3',
    subordinates: ['blacey@yoyodyne.com', 'rgarcia@yoyodyne.com']
  },
  {
    position: 'Stocker',
    name: 'Ronnie Garcia',
    email: 'rgarcia@yoyodyne.com',
    phone: '555-0130',
    businessUnit: 'Production',
    status: 'present',
    icon: 'usericon_male4'
  },
  {
    position: 'Shipping and Receiving Clerk',
    name: 'Bob Lacey',
    email: 'blacey@yoyodyne.com',
    phone: '555-0124',
    businessUnit: 'Production',
    status: 'busy',
    icon: 'usericon_male1'
  },
  {
    position: 'Facilities Manager',
    name: 'Anne Binger',
    email: 'abinger@yoyodyne.com',
    phone: '555-0122',
    businessUnit: 'Production',
    status: 'present',
    icon: 'usericon_female4',
    subordinates: ['tjackson@yoyodyne.com']
  },
  {
    position: 'Facilities Administrative Assistant',
    name: 'Timothy Jackson',
    email: 'tjackson@yoyodyne.com',
    phone: '555-0140',
    businessUnit: 'Production',
    status: 'busy',
    icon: 'usericon_male5',
    subordinates: ['cshort@yoyodyne.com', 'tstark@yoyodyne.com']
  },
  {
    position: 'Janitor',
    name: 'Thomas Stark',
    email: 'tstark@yoyodyne.com',
    phone: '555-0144',
    businessUnit: 'Production',
    status: 'present',
    icon: 'usericon_male2'
  },
  {
    position: 'Maintenance Supervisor',
    name: 'Carmen Short',
    email: 'cshort@yoyodyne.com',
    phone: '555-0142',
    businessUnit: 'Production',
    status: 'present',
    icon: 'usericon_female1'
  },
  {
    position: 'Master Scheduler',
    name: 'Larry Littlefield',
    email: 'llittlefield@yoyodyne.com',
    phone: '555-0126',
    businessUnit: 'Production',
    status: 'present',
    icon: 'usericon_male4'
  },
  {
    position: 'Quality Assurance Manager',
    name: 'Dorothy Turner',
    email: 'dturner@yoyodyne.com',
    phone: '555-0108',
    businessUnit: 'Production',
    status: 'unavailable',
    icon: 'usericon_female3',
    subordinates: ['vburnett@yoyodyne.com', 'emonge@yoyodyne.com']
  },
  {
    position: 'Document Control Manager',
    name: 'Edward Monge',
    email: 'emonge@yoyodyne.com',
    phone: '555-0118',
    businessUnit: 'Production',
    status: 'present',
    icon: 'usericon_male3',
    subordinates: ['hmeyer@yoyodyne.com', 'ljensen@yoyodyne.com']
  },
  {
    position: 'Document Control Assistant',
    name: 'Lisa Jensen',
    email: 'ljensen@yoyodyne.com',
    phone: '555-0120',
    businessUnit: 'Production',
    status: 'busy',
    icon: 'usericon_female2',
    assistant: true
  },
  {
    position: 'Control Specialist',
    name: 'Howard Meyer',
    email: 'hmeyer@yoyodyne.com',
    phone: '555-0116',
    businessUnit: 'Production',
    status: 'present',
    icon: 'usericon_male1'
  },
  {
    position: 'Quality Assurance Supervisor',
    name: 'Valerie Burnett',
    email: 'vburnett@yoyodyne.com',
    phone: '555-0110',
    businessUnit: 'Production',
    status: 'present',
    icon: 'usericon_female1',
    subordinates: ['mcornett@yoyodyne.com']
  },
  {
    position: 'Quality Assurance Technician',
    name: 'Martin Cornett',
    email: 'mcornett@yoyodyne.com',
    phone: '555-0114',
    businessUnit: 'Production',
    status: 'present',
    icon: 'usericon_male2'
  },
  {
    position: 'Chief Executive Assistant',
    name: 'Gary Roberts',
    email: 'groberts@yoyodyne.com',
    phone: '555-0100',
    businessUnit: 'Executive Unit',
    status: 'present',
    icon: 'usericon_male2',
    assistant: true,
    subordinates: ['aburns@yoyodyne.com', 'lnewland@yoyodyne.com']
  },
  {
    position: 'Junior Executive Assistant',
    name: 'Linda Newland',
    email: 'lnewland@yoyodyne.com',
    phone: '555-0112',
    businessUnit: 'Executive Unit',
    status: 'present',
    icon: 'usericon_female1'
  },
  {
    position: 'Senior Executive Assistant',
    name: 'Alexander Burns',
    email: 'aburns@yoyodyne.com',
    phone: '555-0102',
    businessUnit: 'Executive Unit',
    status: 'present',
    icon: 'usericon_male3'
  }
]
