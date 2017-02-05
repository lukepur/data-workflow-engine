const resolver = require('../../src/resolver');
const { expect } = require('chai');

describe('resolver', () => {
  const context = genTestContext();
  let data;

  beforeEach(() => {
    data = genTestData();
  });

  it('should exist', () => {
    expect(resolver).to.be.a('function');
  });

  describe('literal values', () => {
    it('should return the literal value of non-special tokens', () => {
      expect(resolver('test', {}, context, [])).to.eql('test');
      expect(resolver(0, {}, context, [])).to.eql(0);
      expect(resolver(true, {}, context, [])).to.eql(true);
      expect(resolver(false, {}, context, [])).to.eql(false);
    });
  });

  describe('data pointers', () => {
    it('should return this node\'s value', () => {
      expect(resolver('$value', data, context, ['personal_details', 'name', 'title'])).to.eql('miss');
    });

    it('should return this node\'s value when in array', () => {
      const result = resolver('$value', data, context, ['asset_details', 'assets', '0', 'value']);
      expect(result).to.eql(1000);
    });

    it('should return value of node at specific reference', () => {
      const result = resolver('$.personal_details.name.title', data, context, []);
      expect(result).to.eql('miss');
    });

    it('should return value of node at specific reference when in array', () => {
      const result = resolver('$.asset_details.assets.0.value', data, context, []);
      expect(result).to.eql(1000);
    });

    it('should return an array of values when array wildcard `*` is used', () => {
      const result = resolver('$.asset_details.assets.*.value', data, context, ['personal_details', 'name', 'last']);
      expect(result).to.eql([1000, 1000000]);
    });

    it('should return an array of values when array wildcard `*` is used multiple times', () => {
      const result = resolver('$.asset_details.assets.*.depreciations.*', data, context, ['personal_details', 'name', 'last']);
      expect(result).to.eql([100, 90, 81, -30000, -50000, -100000]);
    });

    it('should target this nodes ancestor when ^ is used', () => {
      const result = resolver('$.asset_details.assets.^.description', data, context, ['asset_details', 'assets', '0', 'value']);
      expect(result).to.eql('Robot');
    });

    it('should target correct ancestor paths when multiple ^ are used', () => {
      const result = resolver('$.previous_applications.items.^.comments.^.message', data, context, ['previous_applications', 'items', '0', 'comments', '1', 'author']);
      expect(result).to.eql('Good spot Bob, bad application');
    });

    it('should target correct data when a mix of relative and wildcard markers are used', () => {
      const result = resolver('$.previous_applications.items.^.comments.*.author', data, context, ['previous_applications', 'items', '0', 'comments', '0', 'message']);
      expect(result).to.eql(['Bob', 'Jane']);
    });
  });

  describe('resolvable functions', () => {
    it('should return the result of running a function', () => {
      const resolvable = {
        fn: 'noArgFunc'
      };
      const result = resolver(resolvable, data, context, []);
      expect(result).to.eql('noArgFunc');
    });

    it('should return the result of running a function over the value of a data pointer', () => {
      const resolvable = {
        fn: 'oneArgFunc',
        args: [ '$.personal_details.name.title' ]
      };
      const result = resolver(resolvable, data, context, []);
      expect(result).to.eql('arg: miss');
    });

    it('should resolve nested resolvables', () => {
      const resolvable = {
        fn: 'oneArgFunc',
        args: [
          {
            fn: 'noArgFunc'
          }
        ]
      };
      const result = resolver(resolvable, data, context, []);
      expect(result).to.eql('arg: noArgFunc');
    });
  });

  describe('arrays', () => {
    it('should resolve all array items', () => {
      const resolvable = [
        'test',
        '$.personal_details.name.title',
        '$.asset_details.assets.0.value',
        {
          fn: 'noArgFunc'
        },
        {
          fn: 'oneArgFunc',
          args: ['$.personal_details.name.last']
        }
      ];
      const result = resolver(resolvable, data, context, []);
      expect(result[0]).to.eql('test');
      expect(result[1]).to.eql('miss');
      expect(result[2]).to.eql(1000);
      expect(result[3]).to.eql('noArgFunc');
      expect(result[4]).to.eql('arg: Smith');
    });

    it('should resolve nested array items', () => {
      const resolvable = [
        [
          'test',
          '$.personal_details.name.title',
          '$.asset_details.assets.*.value',
          [
            {
              fn: 'noArgFunc'
            }
          ]
        ]
      ];
      const result = resolver(resolvable, data, context, []);
      expect(result[0][0]).to.eql('test');
      expect(result[0][1]).to.eql('miss');
      expect(result[0][2]).to.eql([1000, 1000000]);
      expect(result[0][3][0]).to.eql('noArgFunc');
    });
  });

  describe('objects', () => {
    it('should resolve object props if no fn prop', () => {
      const resolvable = {
        a: 'test',
        b: '$.personal_details.name.title',
        c: {
          fn: 'noArgFunc'
        }
      };
      const result = resolver(resolvable, data, context, []);
      expect(result.a).to.eql('test');
      expect(result.b).to.eql('miss');
      expect(result.c).to.eql('noArgFunc');
    });

    it('should resolve nested objects if no fn prop', () => {
      const resolvable = {
        a: 'test',
        b: {
          c: '$.personal_details.name.title'
        }
      };
      const result = resolver(resolvable, data, context, []);
      expect(result.a).to.eql('test');
      expect(result.b.c).to.eql('miss');
    });

    it('should not resolve object props if there is a context fn prop', () => {
      const resolvable = {
        a: 'test',
        fn: 'noArgFunc'
      };
      const result = resolver(resolvable, data, context, []);
      expect(result.a).to.be.undefined;
    });
  });
});

function genTestContext() {
  return {
    noArgFunc: function () { return 'noArgFunc'; },
    oneArgFunc: function (arg1) { return 'arg: ' + arg1; }
  };
}

function genTestData() {
  return {
    personal_details: {
      name: {
        title: 'miss',
        last: 'Smith'
      },
      contact_numbers: ['123', '456']
    },
    asset_details: {
      assets: [
        { value: 1000, description: 'Robot', depreciations: [100, 90, 81]},
        { value: 1000000, description: 'Part ownership of studio apartment in London', depreciations: [-30000, -50000, -100000]}
      ]
    },
    previous_applications: {
      items: [
        {
          date: '01/01/2013',
          comments: [
            {
              author: 'Bob',
              message: 'A bit fishy, escalating'
            },
            {
              author: 'Jane',
              message: 'Good spot Bob, bad application'
            }
          ],
          status: 'rejected'
        },
        {
          date: '01/01/2016',
          comments: [
            {
              author: 'Jane',
              message: 'Approved'
            }
          ],
          status: 'approved'
        }
      ]
    }
  };
}
