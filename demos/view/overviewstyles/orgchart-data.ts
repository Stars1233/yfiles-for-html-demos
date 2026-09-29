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
/**
 * A type that describes an Employee.
 * The data is displayed in the properties panel on the right.
 * It is also presented in the node style and considered in the layout.
 */
export type Employee = {
  position?: string
  name?: string
  email?: string
  phone?: string
  businessUnit?: string
  assistant?: boolean
  status?: string
  icon?: string
  subordinates?: Employee[]
  parent?: Employee
}

// The JSON model data for the organization chart example.
// Class TreeBuilder automatically creates
// a yFiles graph model from the data.
export const orgChartData = [
  {
    position: 'Chief Executive Officer',
    name: 'Eric Joplin',
    email: 'ejoplin@yoyodyne.com',
    phone: '555-0100',
    businessUnit: 'Executive Unit',
    status: 'present',
    icon: 'usericon_male1',
    subordinates: [
      {
        position: 'Chief Executive Assistant',
        name: 'Gary Roberts',
        email: 'groberts@yoyodyne.com',
        phone: '555-0100',
        businessUnit: 'Executive Unit',
        status: 'present',
        icon: 'usericon_male2',
        assistant: true,
        subordinates: [
          {
            position: 'Senior Executive Assistant',
            name: 'Alexander Burns',
            email: 'aburns@yoyodyne.com',
            phone: '555-0102',
            businessUnit: 'Executive Unit',
            status: 'present',
            icon: 'usericon_male3'
          },
          {
            position: 'Junior Executive Assistant',
            name: 'Linda Newland',
            email: 'lnewland@yoyodyne.com',
            phone: '555-0112',
            businessUnit: 'Executive Unit',
            status: 'present',
            icon: 'usericon_female1'
          }
        ]
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
          {
            position: 'Quality Assurance Manager',
            name: 'Dorothy Turner',
            email: 'dturner@yoyodyne.com',
            phone: '555-0108',
            businessUnit: 'Production',
            status: 'unavailable',
            icon: 'usericon_female3',
            subordinates: [
              {
                position: 'Quality Assurance Supervisor',
                name: 'Valerie Burnett',
                email: 'vburnett@yoyodyne.com',
                phone: '555-0110',
                businessUnit: 'Production',
                status: 'present',
                icon: 'usericon_female1',
                subordinates: [
                  {
                    position: 'Quality Assurance Technician',
                    name: 'Martin Cornett',
                    email: 'mcornett@yoyodyne.com',
                    phone: '555-0114',
                    businessUnit: 'Production',
                    status: 'present',
                    icon: 'usericon_male2'
                  }
                ]
              },
              {
                position: 'Document Control Manager',
                name: 'Edward Monge',
                email: 'emonge@yoyodyne.com',
                phone: '555-0118',
                businessUnit: 'Production',
                status: 'present',
                icon: 'usericon_male3',
                subordinates: [
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
                    position: 'Document Control Assistant',
                    name: 'Lisa Jensen',
                    email: 'ljensen@yoyodyne.com',
                    phone: '555-0120',
                    businessUnit: 'Production',
                    status: 'travel',
                    icon: 'usericon_female2',
                    assistant: true
                  }
                ]
              }
            ]
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
            position: 'Facilities Manager',
            name: 'Anne Binger',
            email: 'abinger@yoyodyne.com',
            phone: '555-0122',
            businessUnit: 'Production',
            status: 'present',
            icon: 'usericon_female4',
            subordinates: [
              {
                position: 'Facilities Administrative Assistant',
                name: 'Timothy Jackson',
                email: 'tjackson@yoyodyne.com',
                phone: '555-0140',
                businessUnit: 'Production',
                status: 'busy',
                icon: 'usericon_male5',
                subordinates: [
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
                    position: 'Janitor',
                    name: 'Thomas Stark',
                    email: 'tstark@yoyodyne.com',
                    phone: '555-0144',
                    businessUnit: 'Production',
                    status: 'present',
                    icon: 'usericon_male2'
                  }
                ]
              }
            ]
          },
          {
            position: 'Shipping and Receiving Supervisor',
            name: 'Ray Hammond',
            email: 'rhammond@yoyodyne.com',
            phone: '555-0146',
            businessUnit: 'Production',
            status: 'travel',
            icon: 'usericon_male3',
            subordinates: [
              {
                position: 'Shipping and Receiving Clerk',
                name: 'Bob Lacey',
                email: 'blacey@yoyodyne.com',
                phone: '555-0124',
                businessUnit: 'Production',
                status: 'travel',
                icon: 'usericon_male1'
              },
              {
                position: 'Stocker',
                name: 'Ronnie Garcia',
                email: 'rgarcia@yoyodyne.com',
                phone: '555-0130',
                businessUnit: 'Production',
                status: 'present',
                icon: 'usericon_male4'
              }
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
          }
        ]
      },
      {
        position: 'Vice President of Sales',
        name: 'Richard Fuller',
        email: 'rfuller@yoyodyne.com',
        phone: '555-0134',
        businessUnit: 'Sales',
        status: 'present',
        icon: 'usericon_male1',
        subordinates: [
          {
            position: 'North America Sales Manager',
            name: 'Joe Vargas',
            email: 'jvargas@yoyodyne.com',
            phone: '555-0136',
            businessUnit: 'Sales',
            status: 'present',
            icon: 'usericon_male2',
            subordinates: [
              {
                position: 'Sales Representative',
                name: 'Robert Parson',
                email: 'rparson@yoyodyne.com',
                phone: '555-0150',
                businessUnit: 'Sales',
                status: 'travel',
                icon: 'usericon_male3'
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
                name: 'Chris Jones',
                email: 'cjones@yoyodyne.com',
                phone: '555-0144',
                businessUnit: 'Sales',
                status: 'travel',
                icon: 'usericon_male2'
              },
              {
                position: 'Sales Representative',
                name: 'Olivia Taylor',
                email: 'otaylor@yoyodyne.com',
                phone: '555-0278',
                businessUnit: 'Sales',
                status: 'present',
                icon: 'usericon_female2'
              },
              {
                position: 'Sales Representative',
                name: 'Alexander White',
                email: 'awhite@yoyodyne.com',
                phone: '555-0162',
                businessUnit: 'Sales',
                status: 'present',
                icon: 'usericon_male4'
              },
              {
                position: 'Sales Representative',
                name: 'Sophia Harris',
                email: 'sharris@yoyodyne.com',
                phone: '555-0562',
                businessUnit: 'Sales',
                status: 'present',
                icon: 'usericon_female3'
              },
              {
                position: 'Sales Representative',
                name: 'David Martinez',
                email: 'dmartinez@yoyodyne.com',
                phone: '555-0492',
                businessUnit: 'Sales',
                status: 'unavailable',
                icon: 'usericon_male1'
              }
            ]
          },
          {
            position: 'European Sales Manager',
            name: 'Robert Hartman',
            email: 'rhartman@yoyodyne.com',
            phone: '555-0138',
            businessUnit: 'Sales',
            status: 'present',
            icon: 'usericon_male5',
            subordinates: [
              {
                position: 'Sales Representative',
                name: 'Rebecca Polite',
                email: 'rpolite@yoyodyne.com',
                phone: '555-0148',
                businessUnit: 'Sales',
                status: 'travel',
                icon: 'usericon_female3'
              },
              {
                position: 'Sales Representative',
                name: 'Michael Daniels',
                email: 'mdaniels@yoyodyne.com',
                phone: '555-0154',
                businessUnit: 'Sales',
                status: 'travel',
                icon: 'usericon_male1'
              },
              {
                position: 'Sales Representative',
                name: 'John Smith',
                email: 'jsmith@yoyodyne.com',
                phone: '555-0830',
                businessUnit: 'Sales',
                status: 'present',
                icon: 'usericon_male4'
              },
              {
                position: 'Sales Representative',
                name: 'Emma Johnson',
                email: 'ejohnson@yoyodyne.com',
                phone: '555-0356',
                businessUnit: 'Sales',
                status: 'present',
                icon: 'usericon_female1'
              },
              {
                position: 'Sales Representative',
                name: 'Daniel Brown',
                email: 'dbrown@yoyodyne.com',
                phone: '555-0614',
                businessUnit: 'Sales',
                status: 'busy',
                icon: 'usericon_male2'
              },
              {
                position: 'Sales Representative',
                name: 'Megan Davis',
                email: 'mdavis@yoyodyne.com',
                phone: '555-0728',
                businessUnit: 'Sales',
                status: 'unavailable',
                icon: 'usericon_female2'
              },
              {
                position: 'Sales Representative',
                name: 'Matthew Miller',
                email: 'mmiller@yoyodyne.com',
                phone: '555-0486',
                businessUnit: 'Sales',
                status: 'travel',
                icon: 'usericon_male3'
              },
              {
                position: 'Sales Representative',
                name: 'Lauren Wilson',
                email: 'lwilson@yoyodyne.com',
                phone: '555-0904',
                businessUnit: 'Sales',
                status: 'travel',
                icon: 'usericon_female3'
              }
            ]
          }
        ]
      },
      {
        position: 'Vice President of Engineering',
        name: 'Mildred Shark',
        email: 'mshark@yoyodyne.com',
        phone: '555-0156',
        businessUnit: 'Engineering',
        status: 'present',
        icon: 'usericon_female2',
        subordinates: [
          {
            position: 'Engineering Manager',
            name: 'Martha Barnes',
            email: 'mbarnes@yoyodyne.com',
            phone: '555-0158',
            businessUnit: 'Engineering',
            status: 'busy',
            icon: 'usericon_female3',
            subordinates: [
              {
                position: 'Senior Tool Designer',
                name: 'Maria Dossantos',
                email: 'mdossantos@yoyodyne.com',
                phone: '555-0160',
                businessUnit: 'Engineering',
                status: 'present',
                icon: 'usericon_female1',
                subordinates: [
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
                    name: 'Bonnie Penney',
                    email: 'bpenney@yoyodyne.com',
                    phone: '555-0234',
                    businessUnit: 'Engineering',
                    status: 'present',
                    icon: 'usericon_female4'
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
                    name: 'Gregory Arnold',
                    email: 'garnold@yoyodyne.com',
                    phone: '555-0238',
                    businessUnit: 'Engineering',
                    status: 'present',
                    icon: 'usericon_male3'
                  },
                  {
                    position: 'Tool Designer',
                    name: 'Ken Kowalski',
                    email: 'kkowalski@yoyodyne.com',
                    phone: '555-0240',
                    businessUnit: 'Engineering',
                    status: 'present',
                    icon: 'usericon_male1'
                  }
                ]
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
                    name: 'Robert Finn',
                    email: 'rfinn@yoyodyne.com',
                    phone: '555-0246',
                    businessUnit: 'Engineering',
                    status: 'present',
                    icon: 'usericon_male2'
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
                    name: 'Edwin Nagy',
                    email: 'enagy@yoyodyne.com',
                    phone: '555-0166',
                    businessUnit: 'Engineering',
                    status: 'present',
                    icon: 'usericon_male1'
                  }
                ]
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
                    name: 'Matthew Finney',
                    email: 'mfinney@yoyodyne.com',
                    phone: '555-0206',
                    businessUnit: 'Engineering',
                    status: 'travel',
                    icon: 'usericon_male2'
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
                    name: 'Charles Wylam',
                    email: 'cwylam@yoyodyne.com',
                    phone: '555-0212',
                    businessUnit: 'Engineering',
                    status: 'present',
                    icon: 'usericon_male1'
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
                    name: 'Richard Bradshaw',
                    email: 'rbradshaw@yoyodyne.com',
                    phone: '555-0216',
                    businessUnit: 'Engineering',
                    status: 'unavailable',
                    icon: 'usericon_male5'
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
                    name: 'Marty Tucker',
                    email: 'mtucker@yoyodyne.com',
                    phone: '555-0230',
                    businessUnit: 'Engineering',
                    status: 'present',
                    icon: 'usericon_male2'
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
                    name: 'Anthony Rice',
                    email: 'arice@yoyodyne.com',
                    phone: '555-0222',
                    businessUnit: 'Engineering',
                    status: 'busy',
                    icon: 'usericon_male1'
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
                    name: 'Susan Reid',
                    email: 'sreid@yoyodyne.com',
                    phone: '555-0226',
                    businessUnit: 'Engineering',
                    status: 'present',
                    icon: 'usericon_female3'
                  }
                ]
              }
            ]
          }
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
        subordinates: [
          {
            position: 'Accounts Manager',
            name: 'Walter Hastings',
            email: 'whastings@yoyodyne.com',
            phone: '555-0182',
            businessUnit: 'Accounting',
            status: 'present',
            icon: 'usericon_male4',
            subordinates: [
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
                position: 'Accountant',
                name: 'Melvin Cruz',
                email: 'mcruz@yoyodyne.com',
                phone: '555-0186',
                businessUnit: 'Accounting',
                status: 'present',
                icon: 'usericon_male1'
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
                position: 'Financial Analyst',
                name: 'Andrew Lee',
                email: 'alee@yoyodyne.com',
                phone: '555-0182',
                businessUnit: 'Accounting',
                status: 'present',
                icon: 'usericon_male2'
              },
              {
                position: 'Senior Accountant',
                name: 'Brittany Garcia',
                email: 'bgarcia@yoyodyne.com',
                phone: '555-0256',
                businessUnit: 'Accounting',
                status: 'present',
                icon: 'usericon_female1'
              },
              {
                position: 'Controller',
                name: 'Charles Nguyen',
                email: 'cnguyen@yoyodyne.com',
                phone: '555-0478',
                businessUnit: 'Accounting',
                status: 'present',
                icon: 'usericon_male3'
              },
              {
                position: 'Controller',
                name: 'Danielle Cooper',
                email: 'dcooper@yoyodyne.com',
                phone: '555-0502',
                businessUnit: 'Accounting',
                status: 'present',
                icon: 'usericon_female4'
              },
              {
                position: 'Senior Accountant',
                name: 'Ethan Perez',
                email: 'eperez@yoyodyne.com',
                phone: '555-0648',
                businessUnit: 'Accounting',
                status: 'busy',
                icon: 'usericon_male4'
              },
              {
                position: 'Senior Accountant',
                name: 'Fiona Ross',
                email: 'fross@yoyodyne.com',
                phone: '555-0734',
                businessUnit: 'Accounting',
                status: 'present',
                icon: 'usericon_female2'
              }
            ]
          },
          {
            position: 'Finance Manager',
            name: 'Joy Medico',
            email: 'jmedico@yoyodyne.com',
            phone: '555-0190',
            businessUnit: 'Accounting',
            status: 'present',
            icon: 'usericon_female3',
            subordinates: [
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
                position: 'Buyer',
                name: 'Raymond Lindley',
                email: 'rlindley@yoyodyne.com',
                phone: '555-0196',
                businessUnit: 'Accounting',
                status: 'present',
                icon: 'usericon_male3'
              },
              {
                position: 'Financial Controller',
                name: 'Julia Foster',
                email: 'jfoster@yoyodyne.com',
                phone: '555-0820',
                businessUnit: 'Accounting',
                status: 'present',
                icon: 'usericon_female4'
              },
              {
                position: 'Financial Controller',
                name: 'George Young',
                email: 'gyoung@yoyodyne.com',
                phone: '555-0396',
                businessUnit: 'Accounting',
                status: 'present',
                icon: 'usericon_male5'
              },
              {
                position: 'Financial Controller',
                name: 'Hannah Scott',
                email: 'hscott@yoyodyne.com',
                phone: '555-0568',
                businessUnit: 'Accounting',
                status: 'busy',
                icon: 'usericon_female5'
              }
            ]
          },
          {
            position: 'Human Resource Manager',
            name: 'Danny Welch',
            email: 'dwelch@yoyodyne.com',
            phone: '555-0198',
            businessUnit: 'Accounting',
            status: 'present',
            icon: 'usericon_male1',
            subordinates: [
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
                position: 'Benefits Specialist',
                name: 'Mark Parks',
                email: 'mparks@yoyodyne.com',
                phone: '555-0202',
                businessUnit: 'Accounting',
                status: 'present',
                icon: 'usericon_male5'
              },
              {
                position: 'Recruiter',
                name: 'Linda Lenhart',
                email: 'llenhart@yoyodyne.com',
                phone: '555-0204',
                businessUnit: 'Accounting',
                status: 'busy',
                icon: 'usericon_female1'
              }
            ]
          }
        ]
      }
    ]
  }
]
